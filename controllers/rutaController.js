import { Pedido, Ruta, Usuario } from '../models/Index.js'
import manejarError from '../helpers/manejarError.js'

const incluirRuta = [
  {
    model: Usuario,
    as: 'chofer',
    attributes: ['id', 'nombre', 'telefono', 'vehiculo', 'estado']
  },
  {
    model: Pedido,
    as: 'pedidos',
    through: { attributes: ['orden'] }
  }
]

export const obtenerRutas = async (req, res) => {
  try {
    const rutas = await Ruta.findAll({
      include: incluirRuta,
      order: [['createdAt', 'DESC']]
    })

    return res.json({ rutas })
  } catch (error) {
    return manejarError(res, error, 'No se pudieron obtener las rutas')
  }
}

export const crearRuta = async (req, res) => {
  try {
    const { pedidosIds = [], ...datosRuta } = req.body
    const ruta = await Ruta.create(datosRuta)

    if (pedidosIds.length > 0) {
      await ruta.setPedidos(pedidosIds)
    }

    const rutaCompleta = await Ruta.findByPk(ruta.id, { include: incluirRuta })
    req.app.get('io')?.to('admins').emit('rutas:actualizadas')

    return res.status(201).json({ msg: 'Ruta creada correctamente', ruta: rutaCompleta })
  } catch (error) {
    return manejarError(res, error, 'No se pudo crear la ruta')
  }
}

export const actualizarRuta = async (req, res) => {
  try {
    const { pedidosIds, ...datosRuta } = req.body
    const ruta = await Ruta.findByPk(req.params.id)

    if (!ruta) {
      return res.status(404).json({ msg: 'Ruta no encontrada' })
    }

    await ruta.update(datosRuta)

    if (Array.isArray(pedidosIds)) {
      await ruta.setPedidos(pedidosIds)
    }

    const rutaCompleta = await Ruta.findByPk(ruta.id, { include: incluirRuta })
    req.app.get('io')?.to('admins').emit('rutas:actualizadas')

    return res.json({ msg: 'Ruta actualizada correctamente', ruta: rutaCompleta })
  } catch (error) {
    return manejarError(res, error, 'No se pudo actualizar la ruta')
  }
}
