import { Op } from 'sequelize'
import { Destino, EstanciaPedido, Origen, Pedido, UbicacionChofer, Usuario } from '../models/Index.js'
import manejarError from '../helpers/manejarError.js'

const estadosPedido = ['Pendiente', 'Asignado', 'En camino', 'En sitio', 'Comprado', 'Entregado', 'Cancelado']
const prioridadesPedido = ['Alta', 'Media', 'Baja']
const rendimientoBaseKmLitro = Number(process.env.RENDIMIENTO_BASE_KM_LITRO || 8.5)

const inicioDia = (fecha) => {
  const nuevaFecha = new Date(fecha)
  nuevaFecha.setHours(0, 0, 0, 0)
  return nuevaFecha
}

const sumarDias = (fecha, dias) => {
  const nuevaFecha = new Date(fecha)
  nuevaFecha.setDate(nuevaFecha.getDate() + dias)
  return nuevaFecha
}

const obtenerEtiquetaDia = (fecha) => new Intl.DateTimeFormat('es-MX', {
  weekday: 'short',
  day: '2-digit'
}).format(fecha)

const obtenerEtiquetaMes = (fecha) => new Intl.DateTimeFormat('es-MX', {
  month: 'short'
}).format(fecha)

const obtenerSemanaISO = (fechaBase = new Date()) => {
  const fecha = inicioDia(fechaBase)
  fecha.setDate(fecha.getDate() + 4 - (fecha.getDay() || 7))
  const inicioAnio = new Date(fecha.getFullYear(), 0, 1)

  return Math.ceil((((fecha - inicioAnio) / 86400000) + 1) / 7)
}

const obtenerInicioSemanaISO = (anio, semana) => {
  const inicio = new Date(Number(anio), 0, 1 + (Number(semana) - 1) * 7)
  const dia = inicio.getDay() || 7

  if (dia <= 4) {
    inicio.setDate(inicio.getDate() - dia + 1)
  } else {
    inicio.setDate(inicio.getDate() + 8 - dia)
  }

  return inicioDia(inicio)
}

const normalizarEntero = (valor, respaldo, minimo, maximo) => {
  const numero = Number(valor)

  if (!Number.isInteger(numero) || numero < minimo || numero > maximo) {
    return respaldo
  }

  return numero
}

const crearRangoSemanal = (anio, semana) => {
  const inicioSemana = obtenerInicioSemanaISO(anio, semana)

  return Array.from({ length: 7 }, (_, indice) => {
    const fecha = sumarDias(inicioSemana, indice)
    return {
      fecha,
      clave: fecha.toISOString().slice(0, 10),
      nombre: obtenerEtiquetaDia(fecha),
      pedidos: 0,
      entregados: 0
    }
  })
}

const crearRangoMensual = (anio) => {
  return Array.from({ length: 12 }, (_, indice) => {
    const fecha = new Date(Number(anio), indice, 1)
    return {
      fecha,
      clave: `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`,
      nombre: obtenerEtiquetaMes(fecha),
      pedidos: 0,
      entregados: 0,
      cancelados: 0
    }
  })
}

const obtenerClaveDia = (fecha) => inicioDia(fecha).toISOString().slice(0, 10)
const obtenerClaveMes = (fecha) => `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`

const radianes = (valor) => (valor * Math.PI) / 180

const calcularDistanciaMetros = (origen, destino) => {
  const radioTierra = 6371000
  const diferenciaLatitud = radianes(destino.latitud - origen.latitud)
  const diferenciaLongitud = radianes(destino.longitud - origen.longitud)
  const latitudOrigen = radianes(origen.latitud)
  const latitudDestino = radianes(destino.latitud)
  const a = Math.sin(diferenciaLatitud / 2) ** 2
    + Math.cos(latitudOrigen) * Math.cos(latitudDestino) * Math.sin(diferenciaLongitud / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return radioTierra * c
}

const calcularDistanciaPorChofer = (ubicaciones) => {
  const ubicacionesPorChofer = new Map()

  ubicaciones.forEach((ubicacion) => {
    const choferId = Number(ubicacion.chofer_id ?? ubicacion.choferId)
    const lista = ubicacionesPorChofer.get(choferId) ?? []
    lista.push({
      latitud: Number(ubicacion.latitud),
      longitud: Number(ubicacion.longitud),
      fechaGps: ubicacion.fechaGps
    })
    ubicacionesPorChofer.set(choferId, lista)
  })

  return Array.from(ubicacionesPorChofer.entries()).map(([choferId, puntos]) => {
    const puntosOrdenados = puntos
      .filter((punto) => Number.isFinite(punto.latitud) && Number.isFinite(punto.longitud))
      .sort((a, b) => new Date(a.fechaGps) - new Date(b.fechaGps))
    let distanciaMetros = 0

    for (let indice = 1; indice < puntosOrdenados.length; indice += 1) {
      const distancia = calcularDistanciaMetros(puntosOrdenados[indice - 1], puntosOrdenados[indice])

      if (distancia <= 1500) {
        distanciaMetros += distancia
      }
    }

    return {
      choferId,
      kilometros: distanciaMetros / 1000
    }
  })
}

const contarPorCampo = async (Modelo, campo, valores) => {
  const resultados = await Promise.all(
    valores.map(async (valor) => ({
      nombre: valor,
      total: await Modelo.count({ where: { [campo]: valor } })
    }))
  )

  return resultados
}

export const obtenerReportes = async (req, res) => {
  try {
    const hoy = new Date()
    const anioActual = hoy.getFullYear()
    const semanaActual = obtenerSemanaISO(hoy)
    const anioConsulta = normalizarEntero(req.query.anio, anioActual, anioActual - 5, anioActual + 1)
    const semanaConsulta = normalizarEntero(req.query.semana, semanaActual, 1, 53)
    const inicioSemana = obtenerInicioSemanaISO(anioConsulta, semanaConsulta)
    const finSemana = sumarDias(inicioSemana, 7)
    const inicioAnio = new Date(anioConsulta, 0, 1)
    const finAnio = new Date(anioConsulta + 1, 0, 1)
    const inicioPeriodo = inicioSemana < inicioAnio ? inicioSemana : inicioAnio
    const [
      totalPedidos,
      pedidosEntregados,
      pedidosCancelados,
      pedidosActivos,
      totalDestinos,
      destinosActivos,
      totalOrigenes,
      origenesActivos,
      totalChoferes,
      pedidosPorEstado,
      pedidosPorPrioridad,
      ultimosPedidos,
      pedidosCreadosPeriodo,
      pedidosCerradosPeriodo,
      estanciasCerradas,
      ubicacionesPeriodo,
      choferes
    ] = await Promise.all([
      Pedido.count(),
      Pedido.count({ where: { estado: 'Entregado' } }),
      Pedido.count({ where: { estado: 'Cancelado' } }),
      Pedido.count({ where: { estado: { [Op.in]: ['Pendiente', 'Asignado', 'En camino', 'En sitio', 'Comprado'] } } }),
      Destino.count(),
      Destino.count({ where: { activo: true } }),
      Origen.count(),
      Origen.count({ where: { activo: true } }),
      Usuario.count({ where: { rol: 'chofer' } }),
      contarPorCampo(Pedido, 'estado', estadosPedido),
      contarPorCampo(Pedido, 'prioridad', prioridadesPedido),
      Pedido.findAll({
        limit: 6,
        include: [{
          model: Usuario,
          as: 'chofer',
          attributes: ['id', 'nombre']
        }],
        order: [['createdAt', 'DESC']]
      }),
      Pedido.findAll({
        where: { createdAt: { [Op.gte]: inicioPeriodo, [Op.lt]: finAnio } },
        attributes: ['id', 'estado', 'chofer_id', 'createdAt', 'updatedAt'],
        raw: true
      }),
      Pedido.findAll({
        where: {
          estado: { [Op.in]: ['Entregado', 'Cancelado'] },
          updatedAt: { [Op.gte]: inicioPeriodo, [Op.lt]: finAnio }
        },
        attributes: ['id', 'estado', 'chofer_id', 'createdAt', 'updatedAt'],
        raw: true
      }),
      EstanciaPedido.findAll({
        where: {
          salidaAt: { [Op.ne]: null },
          createdAt: { [Op.gte]: inicioAnio, [Op.lt]: finAnio }
        },
        attributes: ['chofer_id', 'duracionSegundos', 'createdAt'],
        raw: true
      }),
      UbicacionChofer.findAll({
        where: { fechaGps: { [Op.gte]: inicioSemana, [Op.lt]: finSemana } },
        attributes: ['chofer_id', 'latitud', 'longitud', 'fechaGps'],
        order: [['chofer_id', 'ASC'], ['fechaGps', 'ASC']],
        raw: true
      }),
      Usuario.findAll({
        where: { rol: 'chofer' },
        attributes: ['id', 'nombre', 'vehiculo'],
        raw: true
      })
    ])
    const serieSemanal = crearRangoSemanal(anioConsulta, semanaConsulta)
    const serieMensual = crearRangoMensual(anioConsulta)
    const semanaPorClave = new Map(serieSemanal.map((item) => [item.clave, item]))
    const mesPorClave = new Map(serieMensual.map((item) => [item.clave, item]))

    pedidosCreadosPeriodo.forEach((pedido) => {
      const fechaCreacion = new Date(pedido.createdAt)
      const claveDia = obtenerClaveDia(fechaCreacion)
      const claveMes = obtenerClaveMes(fechaCreacion)
      const dia = semanaPorClave.get(claveDia)
      const mes = mesPorClave.get(claveMes)

      if (dia) {
        dia.pedidos += 1
      }

      if (mes) {
        mes.pedidos += 1
      }
    })

    pedidosCerradosPeriodo.forEach((pedido) => {
      const fechaCierre = new Date(pedido.updatedAt)
      const claveDia = obtenerClaveDia(fechaCierre)
      const claveMes = obtenerClaveMes(fechaCierre)
      const dia = semanaPorClave.get(claveDia)
      const mes = mesPorClave.get(claveMes)

      if (pedido.estado === 'Entregado' && dia) {
        dia.entregados += 1
      }

      if (mes) {
        if (pedido.estado === 'Entregado') mes.entregados += 1
        if (pedido.estado === 'Cancelado') mes.cancelados += 1
      }
    })

    const distanciaPorChofer = calcularDistanciaPorChofer(ubicacionesPeriodo)
    const kilometrosTotales = distanciaPorChofer.reduce((total, item) => total + item.kilometros, 0)
    const litrosEstimados = rendimientoBaseKmLitro > 0 ? kilometrosTotales / rendimientoBaseKmLitro : 0
    const pedidosUltimosSieteDias = serieSemanal.reduce((total, item) => total + item.pedidos, 0)
    const promedioPedidosDia = pedidosUltimosSieteDias / 7
    const tiempoSitioSegundos = estanciasCerradas.reduce((total, estancia) => total + Number(estancia.duracionSegundos || 0), 0)
    const pedidosPorChofer = new Map()

    pedidosCreadosPeriodo.forEach((pedido) => {
      const choferId = Number(pedido.chofer_id ?? pedido.choferId)
      if (!Number.isFinite(choferId)) return
      const actual = pedidosPorChofer.get(choferId) ?? { pedidos: 0, entregados: 0 }
      actual.pedidos += 1
      pedidosPorChofer.set(choferId, actual)
    })

    pedidosCerradosPeriodo.forEach((pedido) => {
      if (pedido.estado !== 'Entregado') return
      const choferId = Number(pedido.chofer_id ?? pedido.choferId)
      if (!Number.isFinite(choferId)) return
      const actual = pedidosPorChofer.get(choferId) ?? { pedidos: 0, entregados: 0 }
      actual.entregados += 1
      pedidosPorChofer.set(choferId, actual)
    })

    const distanciaMapa = new Map(distanciaPorChofer.map((item) => [item.choferId, item.kilometros]))
    const rendimientoChoferes = choferes
      .map((chofer) => {
        const pedidosChofer = pedidosPorChofer.get(Number(chofer.id)) ?? { pedidos: 0, entregados: 0 }
        const kilometros = distanciaMapa.get(Number(chofer.id)) ?? 0
        const litros = rendimientoBaseKmLitro > 0 ? kilometros / rendimientoBaseKmLitro : 0

        return {
          id: chofer.id,
          nombre: chofer.nombre,
          vehiculo: chofer.vehiculo,
          pedidos: pedidosChofer.pedidos,
          entregados: pedidosChofer.entregados,
          kilometros: Number(kilometros.toFixed(1)),
          litros: Number(litros.toFixed(1)),
          rendimiento: rendimientoBaseKmLitro
        }
      })
      .sort((a, b) => b.entregados - a.entregados || b.pedidos - a.pedidos)

    return res.json({
      resumen: {
        totalPedidos,
        pedidosEntregados,
        pedidosCancelados,
        pedidosActivos,
        totalDestinos,
        destinosActivos,
        totalOrigenes,
        origenesActivos,
        totalChoferes,
        promedioPedidosDia: Number(promedioPedidosDia.toFixed(1)),
        kilometrosRecorridos: Number(kilometrosTotales.toFixed(1)),
        litrosEstimados: Number(litrosEstimados.toFixed(1)),
        rendimientoCombustible: rendimientoBaseKmLitro,
        tiempoSitioHoras: Number((tiempoSitioSegundos / 3600).toFixed(1))
      },
      filtros: {
        anio: anioConsulta,
        semana: semanaConsulta,
        semanaActual,
        anioActual,
        semanas: Array.from({ length: 53 }, (_, indice) => indice + 1),
        anios: Array.from({ length: 6 }, (_, indice) => anioActual - indice)
      },
      serieSemanal,
      serieMensual,
      rendimientoChoferes,
      pedidosPorEstado,
      pedidosPorPrioridad,
      catalogosOperacion: [
        { nombre: 'Destinos', total: totalDestinos, activos: destinosActivos, inactivos: totalDestinos - destinosActivos },
        { nombre: 'Origenes', total: totalOrigenes, activos: origenesActivos, inactivos: totalOrigenes - origenesActivos }
      ],
      ultimosPedidos
    })
  } catch (error) {
    return manejarError(res, error, 'No se pudieron obtener los reportes')
  }
}
