import { Usuario } from '../models/Index.js'
import manejarError from '../helpers/manejarError.js'

export const obtenerChoferes = async (req, res) => {
  try {
    const choferes = await Usuario.findAll({
      where: { rol: 'chofer' },
      order: [['nombre', 'ASC']]
    })

    return res.json({ choferes })
  } catch (error) {
    return manejarError(res, error, 'No se pudieron obtener los choferes')
  }
}

export const crearChofer = async (req, res) => {
  try {
    const chofer = await Usuario.create({ ...req.body, rol: 'chofer' })
    req.app.get('io')?.to('admins').emit('choferes:actualizados')

    return res.status(201).json({ msg: 'Chofer creado correctamente', chofer })
  } catch (error) {
    return manejarError(res, error, 'No se pudo crear el chofer')
  }
}
