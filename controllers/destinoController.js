import { Destino } from '../models/Index.js'
import manejarError from '../helpers/manejarError.js'

export const obtenerDestinos = async (req, res) => {
  try {
    const destinos = await Destino.findAll({
      where: { activo: true },
      order: [['nombre', 'ASC']]
    })

    return res.json({ destinos })
  } catch (error) {
    return manejarError(res, error, 'No se pudieron obtener los destinos')
  }
}

export const crearDestino = async (req, res) => {
  try {
    const nombre = req.body.nombre?.trim()

    if (!nombre) {
      return res.status(400).json({ msg: 'El nombre del destino es obligatorio' })
    }

    const [destino, creado] = await Destino.findOrCreate({
      where: { nombre },
      defaults: {
        nombre,
        direccion: req.body.direccion || null,
        latitud: req.body.latitud || null,
        longitud: req.body.longitud || null,
        activo: true
      }
    })

    if (!creado) {
      await destino.update({
        direccion: req.body.direccion || destino.direccion,
        latitud: req.body.latitud || destino.latitud,
        longitud: req.body.longitud || destino.longitud,
        activo: true
      })
    }

    req.app.get('io')?.to('admins').emit('destinos:actualizados')

    return res.status(201).json({ msg: 'Destino guardado correctamente', destino })
  } catch (error) {
    return manejarError(res, error, 'No se pudo guardar el destino')
  }
}

export const actualizarDestino = async (req, res) => {
  try {
    const destino = await Destino.findByPk(req.params.id)

    if (!destino) {
      return res.status(404).json({ msg: 'Destino no encontrado' })
    }

    await destino.update({
      nombre: req.body.nombre?.trim() || destino.nombre,
      direccion: req.body.direccion ?? destino.direccion,
      latitud: req.body.latitud ?? destino.latitud,
      longitud: req.body.longitud ?? destino.longitud,
      activo: req.body.activo ?? destino.activo
    })

    req.app.get('io')?.to('admins').emit('destinos:actualizados')

    return res.json({ msg: 'Destino actualizado correctamente', destino })
  } catch (error) {
    return manejarError(res, error, 'No se pudo actualizar el destino')
  }
}

export const eliminarDestino = async (req, res) => {
  try {
    const destino = await Destino.findByPk(req.params.id)

    if (!destino) {
      return res.status(404).json({ msg: 'Destino no encontrado' })
    }

    await destino.update({ activo: false })
    req.app.get('io')?.to('admins').emit('destinos:actualizados')

    return res.json({ msg: 'Destino eliminado correctamente' })
  } catch (error) {
    return manejarError(res, error, 'No se pudo eliminar el destino')
  }
}
