import SeguimientoService from '../services/SeguimientoService.js'
import { EstanciaPedido, Pedido } from '../models/Index.js'
import manejarError from '../helpers/manejarError.js'
import { Op } from 'sequelize'

const estadosActivosChofer = ['En camino', 'En sitio']
const estadosVisiblesParaChofer = ['Pendiente', 'Asignado', 'En camino', 'En sitio', 'Comprado']

const coordenadaVacia = (valor) => valor === undefined || valor === null || String(valor).trim() === ''

const pedidoTieneDestinoGps = (pedido) => {
  if (coordenadaVacia(pedido.destinoLatitud) || coordenadaVacia(pedido.destinoLongitud)) {
    return false
  }

  const latitud = Number(pedido.destinoLatitud)
  const longitud = Number(pedido.destinoLongitud)

  return Number.isFinite(latitud) && Number.isFinite(longitud)
}

const obtenerDistanciaMetros = (origen, destino) => {
  const radioTierra = 6371000
  const gradosARadianes = (valor) => (valor * Math.PI) / 180
  const latitudOrigen = gradosARadianes(origen.latitud)
  const latitudDestino = gradosARadianes(destino.latitud)
  const diferenciaLatitud = gradosARadianes(destino.latitud - origen.latitud)
  const diferenciaLongitud = gradosARadianes(destino.longitud - origen.longitud)
  const a = Math.sin(diferenciaLatitud / 2) ** 2
    + Math.cos(latitudOrigen) * Math.cos(latitudDestino) * Math.sin(diferenciaLongitud / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return Math.round(radioTierra * c)
}

const obtenerUbicacionConsulta = (query = {}) => {
  const latitud = Number(query.latitud ?? query.latitude)
  const longitud = Number(query.longitud ?? query.longitude)

  if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) {
    return null
  }

  return { latitud, longitud }
}

const anexarDatosOperativosPedidos = async (pedidos, choferId, ubicacionActual) => {
  const estanciasAbiertas = await EstanciaPedido.findAll({
    where: {
      chofer_id: choferId,
      salidaAt: null
    }
  })
  const estanciasPorPedido = new Map(estanciasAbiertas.map((estancia) => [Number(estancia.get('pedido_id')), estancia]))
  const pedidosConDatos = pedidos.map((pedido) => {
    const pedidoPlano = pedido.toJSON()
    const latitudDestino = Number(pedido.destinoLatitud)
    const longitudDestino = Number(pedido.destinoLongitud)
    const tieneDestino = Number.isFinite(latitudDestino) && Number.isFinite(longitudDestino)
    const distanciaMetros = ubicacionActual && tieneDestino
      ? obtenerDistanciaMetros(ubicacionActual, { latitud: latitudDestino, longitud: longitudDestino })
      : null
    const estanciaActiva = estanciasPorPedido.get(Number(pedido.id))

    return {
      ...pedidoPlano,
      distanciaMetros,
      recomendado: false,
      estanciaActiva: estanciaActiva ? {
        id: estanciaActiva.id,
        llegadaAt: estanciaActiva.llegadaAt
      } : null
    }
  })
  const pedidoRecomendado = pedidosConDatos
    .filter((pedido) => !estadosActivosChofer.includes(pedido.estado) && Number.isFinite(pedido.distanciaMetros))
    .sort((a, b) => a.distanciaMetros - b.distanciaMetros)[0]

  return pedidosConDatos
    .map((pedido) => ({ ...pedido, recomendado: pedido.id === pedidoRecomendado?.id }))
    .sort((a, b) => {
      if (estadosActivosChofer.includes(a.estado) && !estadosActivosChofer.includes(b.estado)) return -1
      if (!estadosActivosChofer.includes(a.estado) && estadosActivosChofer.includes(b.estado)) return 1
      if (a.recomendado && !b.recomendado) return -1
      if (!a.recomendado && b.recomendado) return 1
      if (Number.isFinite(a.distanciaMetros) && Number.isFinite(b.distanciaMetros)) {
        return a.distanciaMetros - b.distanciaMetros
      }
      return new Date(b.createdAt) - new Date(a.createdAt)
    })
}

// Devuelve el estado que el servidor tiene en memoria para el mapa.
// Esto se usa cuando un administrador entra o refresca la pantalla de seguimiento.
export const obtenerChoferesEnSeguimiento = async (req, res) => {
  return res.json({ drivers: SeguimientoService.obtenerEstadoSeguimiento() })
}

// Entrada HTTP para registrar ubicaciones.
// El flujo principal usa Socket.IO, pero este endpoint queda util para pruebas,
// Postman o integraciones futuras donde no se quiera usar sockets.
export const registrarUbicacionHttp = async (req, res) => {
  try {
    // req.app.get('io') recupera la instancia de Socket.IO creada en index.js.
    // Asi el controller puede avisar a los administradores cuando llega una ubicacion.
    const ubicacion = await SeguimientoService.registrarUbicacionEnVivo(req.body, req.app.get('io'))
    return res.status(201).json({ driver: ubicacion })
  } catch (error) {
    return res.status(400).json({ msg: error.message })
  }
}

export const obtenerPedidosChofer = async (req, res) => {
  try {
    const ubicacionActual = obtenerUbicacionConsulta(req.query)
    const pedidos = await Pedido.findAll({
      where: {
        chofer_id: req.usuario.id,
        estado: { [Op.in]: estadosVisiblesParaChofer }
      }
    })
    const pedidosOrdenados = await anexarDatosOperativosPedidos(pedidos, req.usuario.id, ubicacionActual)

    return res.json({ pedidos: pedidosOrdenados })
  } catch (error) {
    return manejarError(res, error, 'No se pudieron obtener los pedidos del chofer')
  }
}

export const activarPedidoChofer = async (req, res) => {
  try {
    const pedido = await Pedido.findOne({
      where: {
        id: req.params.id,
        chofer_id: req.usuario.id
      }
    })

    if (!pedido) {
      return res.status(404).json({ msg: 'Pedido no encontrado para este chofer' })
    }

    if (!pedidoTieneDestinoGps(pedido)) {
      return res.status(400).json({ msg: 'Este pedido no tiene una ubicacion GPS valida.' })
    }

    const pedidoActivo = await Pedido.findOne({
      where: {
        chofer_id: req.usuario.id,
        estado: { [Op.in]: estadosActivosChofer },
        id: { [Op.ne]: pedido.id }
      }
    })

    if (pedidoActivo) {
      return res.status(409).json({
        msg: `Primero finaliza el pedido activo ${pedidoActivo.folio} antes de iniciar otro.`
      })
    }

    if (estadosActivosChofer.includes(pedido.estado)) {
      return res.json({ msg: 'Este pedido ya esta activo', pedido })
    }

    await pedido.update({ estado: 'En camino' })

    await SeguimientoService.sincronizarPedidoActivoChofer(req.usuario.id, req.app.get('io'))
    req.app.get('io')?.to('admins').emit('pedidos:actualizados')
    req.app.get('io')?.to('admins').emit('seguimiento:pedido-activo', {
      choferId: String(req.usuario.id),
      pedidoId: pedido.id
    })

    return res.json({ msg: 'Pedido activado correctamente', pedido })
  } catch (error) {
    return manejarError(res, error, 'No se pudo activar el pedido')
  }
}

export const marcarLlegadaPedidoChofer = async (req, res) => {
  try {
    const pedido = await Pedido.findOne({
      where: {
        id: req.params.id,
        chofer_id: req.usuario.id
      }
    })

    if (!pedido) {
      return res.status(404).json({ msg: 'Pedido no encontrado para este chofer' })
    }

    if (!estadosActivosChofer.includes(pedido.estado)) {
      return res.status(400).json({ msg: 'Solo puedes marcar llegada en el pedido activo.' })
    }

    let estancia = await EstanciaPedido.findOne({
      where: {
        pedido_id: pedido.id,
        chofer_id: req.usuario.id,
        salidaAt: null
      }
    })

    if (!estancia) {
      const llegadaAt = new Date()
      estancia = await EstanciaPedido.create({
        pedido_id: pedido.id,
        chofer_id: req.usuario.id,
        llegadaAt
      })
    }

    if (pedido.estado !== 'En sitio') {
      await pedido.update({ estado: 'En sitio' })
    }

    await SeguimientoService.sincronizarPedidoActivoChofer(req.usuario.id, req.app.get('io'))
    req.app.get('io')?.to('admins').emit('pedidos:actualizados')
    req.app.get('io')?.to('admins').emit('seguimiento:llegada-registrada', {
      choferId: String(req.usuario.id),
      pedidoId: pedido.id,
      llegadaAt: estancia.llegadaAt
    })

    return res.status(201).json({
      msg: 'Llegada registrada correctamente',
      estancia: {
        id: estancia.id,
        llegadaAt: estancia.llegadaAt,
        salidaAt: estancia.salidaAt,
        duracionSegundos: estancia.duracionSegundos
      }
    })
  } catch (error) {
    return manejarError(res, error, 'No se pudo registrar la llegada')
  }
}

export const finalizarPedidoChofer = async (req, res) => {
  try {
    const pedido = await Pedido.findOne({
      where: {
        id: req.params.id,
        chofer_id: req.usuario.id
      }
    })

    if (!pedido) {
      return res.status(404).json({ msg: 'Pedido no encontrado para este chofer' })
    }

    if (pedido.estado === 'Entregado') {
      return res.json({ msg: 'Este pedido ya fue finalizado', pedido, estancia: null })
    }

    if (pedido.estado !== 'En sitio') {
      return res.status(400).json({ msg: 'Primero marca que ya llegaste al destino.' })
    }

    let estancia = await EstanciaPedido.findOne({
      where: {
        pedido_id: pedido.id,
        chofer_id: req.usuario.id,
        salidaAt: null
      },
      order: [['llegadaAt', 'DESC']]
    })

    const salidaAt = new Date()
    if (!estancia) {
      estancia = await EstanciaPedido.create({
        pedido_id: pedido.id,
        chofer_id: req.usuario.id,
        llegadaAt: pedido.updatedAt || salidaAt
      })
    }

    const duracionSegundos = Math.max(0, Math.round((salidaAt - estancia.llegadaAt) / 1000))

    await estancia.update({
      salidaAt,
      duracionSegundos
    })
    await pedido.update({ estado: 'Entregado' })

    await SeguimientoService.sincronizarPedidoActivoChofer(req.usuario.id, req.app.get('io'))
    req.app.get('io')?.to('admins').emit('pedidos:actualizados')
    req.app.get('io')?.to('admins').emit('seguimiento:pedido-finalizado', {
      choferId: String(req.usuario.id),
      pedidoId: pedido.id,
      salidaAt
    })

    return res.json({
      msg: 'Pedido finalizado correctamente',
      pedido,
      estancia: {
        id: estancia.id,
        llegadaAt: estancia.llegadaAt,
        salidaAt: estancia.salidaAt,
        duracionSegundos: estancia.duracionSegundos
      }
    })
  } catch (error) {
    return manejarError(res, error, 'No se pudo finalizar el pedido')
  }
}
