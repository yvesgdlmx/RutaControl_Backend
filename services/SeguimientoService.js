import { Pedido, Ruta, UbicacionChofer, Usuario } from '../models/Index.js'
import { Op } from 'sequelize'
import jwt from 'jsonwebtoken'

const MAXIMO_PUNTOS_HISTORIAL = 500

// Estado rapido para el mapa en vivo.
// Se guarda en memoria para no consultar MySQL en cada movimiento del GPS.
const estadoSeguimiento = {
  choferes: new Map(),
  choferesDetenidos: new Set()
}

// El telefono y futuras apps pueden enviar nombres distintos o valores como texto.
// Aqui dejamos todo en un formato unico antes de validar y guardar.
const normalizarUbicacion = (datos, chofer) => ({
  driverId: String(chofer?.id ?? datos.driverId ?? 'driver-demo'),
  driverName: String(chofer?.nombre ?? datos.driverName ?? 'Chofer demo'),
  latitude: Number(datos.latitude),
  longitude: Number(datos.longitude),
  accuracy: datos.accuracy == null ? null : Number(datos.accuracy),
  speed: datos.speed == null ? null : Number(datos.speed),
  heading: datos.heading == null ? null : Number(datos.heading),
  timestamp: datos.timestamp ?? new Date().toISOString()
})

const obtenerTokenSeguimiento = (datos = {}) => datos.token || datos.authToken || datos.jwt

const obtenerChoferDesdeToken = async (datos = {}) => {
  const token = obtenerTokenSeguimiento(datos)

  if (!token) {
    throw new Error('Sesion de chofer requerida')
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'rutacontrol_secret_desarrollo')
  const chofer = await Usuario.findByPk(decoded.id)

  if (!chofer || chofer.rol !== 'chofer' || chofer.estado === 'inactivo') {
    throw new Error('Chofer no autorizado para seguimiento')
  }

  return chofer
}

// Si el chofer tiene una ruta activa, la ubicacion queda ligada a esa ruta.
// Si no tiene ruta activa, igual se guarda el punto GPS solo con el chofer.
const obtenerRutaActiva = async (choferId) => Ruta.findOne({
  where: {
    chofer_id: choferId,
    estado: 'Activa'
  },
  order: [['createdAt', 'DESC']]
})

const obtenerPedidoActivo = async (choferId) => Pedido.findOne({
  where: {
    chofer_id: choferId,
    estado: { [Op.in]: ['En camino', 'En sitio'] }
  },
  order: [['updatedAt', 'DESC']]
})

const formatearPedidoActivo = (pedido) => {
  if (!pedido) {
    return null
  }

  return {
    id: pedido.id,
    folio: pedido.folio,
    descripcion: pedido.descripcion,
    origen: pedido.origen,
    destino: pedido.destino,
    destinoLatitud: Number(pedido.destinoLatitud),
    destinoLongitud: Number(pedido.destinoLongitud),
    estado: pedido.estado
  }
}

const sincronizarPedidoActivoChofer = async (choferId, io) => {
  const driverId = String(choferId)
  const estadoActual = estadoSeguimiento.choferes.get(driverId)

  if (!estadoActual) {
    return null
  }

  const pedidoActivo = await obtenerPedidoActivo(choferId)
  const estadoChofer = {
    ...estadoActual,
    pedidoActivo: formatearPedidoActivo(pedidoActivo)
  }

  estadoSeguimiento.choferes.set(driverId, estadoChofer)
  io?.to('admins').emit('driver:location', estadoChofer)
  io?.to('admins').emit('tracking:snapshot', obtenerEstadoSeguimiento())

  return estadoChofer
}

// Snapshot que consume el panel cuando abre la pantalla de seguimiento.
const obtenerEstadoSeguimiento = () => Array.from(estadoSeguimiento.choferes.values())

const iniciarSeguimientoChofer = async (datos) => {
  const chofer = await obtenerChoferDesdeToken(datos)
  const driverId = String(chofer.id)

  estadoSeguimiento.choferesDetenidos.delete(driverId)

  return { driverId, driverName: chofer.nombre }
}

const detenerSeguimientoChofer = async (datos, io) => {
  const chofer = await obtenerChoferDesdeToken(datos)
  const driverId = String(chofer.id)

  estadoSeguimiento.choferesDetenidos.add(driverId)
  estadoSeguimiento.choferes.delete(driverId)
  io?.to('admins').emit('driver:stopped', { driverId })
  io?.to('admins').emit('tracking:snapshot', obtenerEstadoSeguimiento())

  return { driverId }
}

// Punto central del seguimiento:
// 1. normaliza coordenadas
// 2. actualiza el estado en memoria
// 3. avisa al panel por Socket.IO
// 4. intenta guardar el historial en MySQL
const registrarUbicacionEnVivo = async (datos, io) => {
  const chofer = await obtenerChoferDesdeToken(datos)
  const ubicacion = normalizarUbicacion(datos, chofer)

  if (estadoSeguimiento.choferesDetenidos.has(ubicacion.driverId)) {
    return null
  }

  if (!Number.isFinite(ubicacion.latitude) || !Number.isFinite(ubicacion.longitude)) {
    throw new Error('Coordenadas invalidas')
  }

  const pedidoActivo = await obtenerPedidoActivo(chofer.id)
  const actual = estadoSeguimiento.choferes.get(ubicacion.driverId)
  const historial = [...(actual?.history ?? []), ubicacion].slice(-MAXIMO_PUNTOS_HISTORIAL)
  const estadoChofer = { ...ubicacion, history: historial, pedidoActivo: formatearPedidoActivo(pedidoActivo) }

  // Este Map siempre tiene la ultima posicion por chofer.
  // Tambien conserva un historial corto para pintar el recorrido en el mapa.
  estadoSeguimiento.choferes.set(ubicacion.driverId, estadoChofer)

  // Todos los administradores unidos a la sala "admins" reciben el nuevo punto.
  io?.to('admins').emit('driver:location', estadoChofer)

  try {
    const rutaActiva = await obtenerRutaActiva(chofer.id)

    await UbicacionChofer.create({
      chofer_id: chofer.id,
      ruta_id: rutaActiva?.id ?? null,
      pedido_id: pedidoActivo?.id ?? null,
      latitud: ubicacion.latitude,
      longitud: ubicacion.longitude,
      precision: ubicacion.accuracy,
      velocidad: ubicacion.speed,
      rumbo: ubicacion.heading,
      fechaGps: new Date(ubicacion.timestamp)
    })
  } catch (error) {
    // El rastreo en vivo no debe caerse si MySQL falla.
    // Por eso solo avisamos en consola y dejamos que el socket siga funcionando.
    console.warn('No se pudo guardar la ubicacion en MySQL:', error.message)
  }

  return estadoChofer
}

// Aqui se registran los eventos de Socket.IO relacionados con seguimiento.
// Separarlo del index.js mantiene el arranque limpio y deja esta logica en un solo lugar.
const configurarEventosSeguimiento = (io) => {
  io.on('connection', (socket) => {
    // El panel administrativo entra a esta sala para recibir ubicaciones en vivo.
    socket.on('admin:join', () => {
      socket.join('admins')
      socket.emit('tracking:snapshot', obtenerEstadoSeguimiento())
    })

    socket.on('driver:join', async (datos = {}) => {
      try {
        const chofer = await obtenerChoferDesdeToken(datos)
        socket.join(`driver:${chofer.id}`)
        socket.emit('driver:ready', { ok: true, driverId: chofer.id, driverName: chofer.nombre })
      } catch (error) {
        socket.emit('driver:error', { message: error.message })
      }
    })

    socket.on('driver:start', async (datos = {}) => {
      try {
        const seguimiento = await iniciarSeguimientoChofer(datos)
        socket.emit('driver:start:ack', { ok: true, driverId: seguimiento.driverId, driverName: seguimiento.driverName })
      } catch (error) {
        socket.emit('driver:error', { message: error.message })
      }
    })

    // Cada vez que el telefono obtiene GPS, manda este evento.
    // Si todo sale bien, respondemos con ack para que el telefono sepa que llego.
    socket.on('driver:location', async (datos = {}) => {
      try {
        const ubicacion = await registrarUbicacionEnVivo(datos, io)
        if (ubicacion) {
          socket.emit('driver:location:ack', { timestamp: ubicacion.timestamp })
        }
      } catch (error) {
        socket.emit('driver:error', { message: error.message })
      }
    })

    socket.on('driver:stop', async (datos = {}) => {
      try {
        const seguimiento = await detenerSeguimientoChofer(datos, io)
        socket.emit('driver:stop:ack', { ok: true, driverId: seguimiento.driverId })
      } catch (error) {
        socket.emit('driver:error', { message: error.message })
      }
    })
  })
}

export default {
  configurarEventosSeguimiento,
  detenerSeguimientoChofer,
  iniciarSeguimientoChofer,
  obtenerEstadoSeguimiento,
  registrarUbicacionEnVivo,
  sincronizarPedidoActivoChofer
}
