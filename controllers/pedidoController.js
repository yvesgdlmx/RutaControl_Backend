import { Pedido, Usuario } from '../models/Index.js'
import manejarError from '../helpers/manejarError.js'

const incluirChofer = {
  model: Usuario,
  as: 'chofer',
  attributes: ['id', 'nombre', 'telefono', 'vehiculo', 'estado']
}

const generarFolioPedido = async () => {
  const totalPedidos = await Pedido.count()
  return `RC-${String(totalPedidos + 1).padStart(5, '0')}`
}

const coordenadaVacia = (valor) => valor === undefined || valor === null || String(valor).trim() === ''

const validarDestinoPedido = (datosPedido) => {
  if (coordenadaVacia(datosPedido.destinoLatitud) || coordenadaVacia(datosPedido.destinoLongitud)) {
    return 'Selecciona un destino con ubicacion en el mapa o mediante el buscador.'
  }

  const latitud = Number(datosPedido.destinoLatitud)
  const longitud = Number(datosPedido.destinoLongitud)

  if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) {
    return 'Selecciona un destino con ubicacion en el mapa o mediante el buscador.'
  }

  if (latitud < -90 || latitud > 90 || longitud < -180 || longitud > 180) {
    return 'Las coordenadas del destino no son validas.'
  }

  return null
}

export const obtenerPedidos = async (req, res) => {
  try {
    const pedidos = await Pedido.findAll({
      include: [incluirChofer],
      order: [['createdAt', 'DESC']]
    })

    return res.json({ pedidos })
  } catch (error) {
    return manejarError(res, error, 'No se pudieron obtener los pedidos')
  }
}

export const obtenerPedido = async (req, res) => {
  try {
    const pedido = await Pedido.findByPk(req.params.id, { include: [incluirChofer] })

    if (!pedido) {
      return res.status(404).json({ msg: 'Pedido no encontrado' })
    }

    return res.json({ pedido })
  } catch (error) {
    return manejarError(res, error, 'No se pudo obtener el pedido')
  }
}

export const crearPedido = async (req, res) => {
  try {
    const errorDestino = validarDestinoPedido(req.body)

    if (errorDestino) {
      return res.status(400).json({ msg: errorDestino })
    }

    const datosPedido = {
      ...req.body,
      folio: req.body.folio || await generarFolioPedido()
    }

    const pedido = await Pedido.create(datosPedido)
    req.app.get('io')?.to('admins').emit('pedidos:actualizados')

    return res.status(201).json({ msg: 'Pedido creado correctamente', pedido })
  } catch (error) {
    return manejarError(res, error, 'No se pudo crear el pedido')
  }
}

export const actualizarPedido = async (req, res) => {
  try {
    const errorDestino = validarDestinoPedido(req.body)

    if (errorDestino) {
      return res.status(400).json({ msg: errorDestino })
    }

    const pedido = await Pedido.findByPk(req.params.id)

    if (!pedido) {
      return res.status(404).json({ msg: 'Pedido no encontrado' })
    }

    await pedido.update(req.body)
    req.app.get('io')?.to('admins').emit('pedidos:actualizados')

    return res.json({ msg: 'Pedido actualizado correctamente', pedido })
  } catch (error) {
    return manejarError(res, error, 'No se pudo actualizar el pedido')
  }
}

export const eliminarPedido = async (req, res) => {
  try {
    const pedido = await Pedido.findByPk(req.params.id)

    if (!pedido) {
      return res.status(404).json({ msg: 'Pedido no encontrado' })
    }

    await pedido.destroy()
    req.app.get('io')?.to('admins').emit('pedidos:actualizados')

    return res.json({ msg: 'Pedido eliminado correctamente' })
  } catch (error) {
    return manejarError(res, error, 'No se pudo eliminar el pedido')
  }
}
