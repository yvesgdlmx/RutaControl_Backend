import { Op } from 'sequelize'
import { Pedido, Ruta, Usuario } from '../models/Index.js'
import manejarError from '../helpers/manejarError.js'

export const obtenerResumen = async (req, res) => {
  try {
    const [pedidosActivos, pedidosAlta, choferesDisponibles, rutasActivas] = await Promise.all([
      Pedido.count({ where: { estado: { [Op.in]: ['Pendiente', 'Asignado', 'En camino', 'En sitio', 'Comprado'] } } }),
      Pedido.count({ where: { prioridad: 'Alta' } }),
      Usuario.count({ where: { rol: 'chofer', estado: 'activo' } }),
      Ruta.count({ where: { estado: 'Activa' } })
    ])

    return res.json({
      resumen: {
        pedidosActivos,
        pedidosAlta,
        choferesDisponibles,
        rutasActivas,
        tiempoPromedio: '42m'
      }
    })
  } catch (error) {
    return manejarError(res, error, 'No se pudo obtener el resumen')
  }
}
