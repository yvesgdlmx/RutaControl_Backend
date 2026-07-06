import { Origen } from '../models/Index.js'
import manejarError from '../helpers/manejarError.js'

const origenesBase = [
  {
    nombre: 'Base Optimex Zapopan',
    direccion: 'Zapopan, Jalisco',
    latitud: 20.7236000,
    longitud: -103.3848000
  }
]

const asegurarOrigenesBase = async () => {
  await Promise.all(
    origenesBase.map(async (origenBase) => {
      const [origen] = await Origen.findOrCreate({
        where: { nombre: origenBase.nombre },
        defaults: origenBase
      })

      if (!origen.latitud || !origen.longitud) {
        await origen.update({
          direccion: origen.direccion || origenBase.direccion,
          latitud: origenBase.latitud,
          longitud: origenBase.longitud,
          activo: true
        })
      }
    })
  )
}

export const obtenerOrigenes = async (req, res) => {
  try {
    await asegurarOrigenesBase()

    const origenes = await Origen.findAll({
      where: { activo: true },
      order: [['nombre', 'ASC']]
    })

    return res.json({ origenes })
  } catch (error) {
    return manejarError(res, error, 'No se pudieron obtener los origenes')
  }
}

export const crearOrigen = async (req, res) => {
  try {
    const nombre = req.body.nombre?.trim()

    if (!nombre) {
      return res.status(400).json({ msg: 'El nombre del origen es obligatorio' })
    }

    const [origen, creado] = await Origen.findOrCreate({
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
      await origen.update({
        direccion: req.body.direccion || origen.direccion,
        latitud: req.body.latitud || origen.latitud,
        longitud: req.body.longitud || origen.longitud,
        activo: true
      })
    }

    req.app.get('io')?.to('admins').emit('origenes:actualizados')

    return res.status(201).json({ msg: 'Origen guardado correctamente', origen })
  } catch (error) {
    return manejarError(res, error, 'No se pudo guardar el origen')
  }
}

export const actualizarOrigen = async (req, res) => {
  try {
    const origen = await Origen.findByPk(req.params.id)

    if (!origen) {
      return res.status(404).json({ msg: 'Origen no encontrado' })
    }

    await origen.update({
      nombre: req.body.nombre?.trim() || origen.nombre,
      direccion: req.body.direccion ?? origen.direccion,
      latitud: req.body.latitud ?? origen.latitud,
      longitud: req.body.longitud ?? origen.longitud,
      activo: req.body.activo ?? origen.activo
    })

    req.app.get('io')?.to('admins').emit('origenes:actualizados')

    return res.json({ msg: 'Origen actualizado correctamente', origen })
  } catch (error) {
    return manejarError(res, error, 'No se pudo actualizar el origen')
  }
}

export const eliminarOrigen = async (req, res) => {
  try {
    const origen = await Origen.findByPk(req.params.id)

    if (!origen) {
      return res.status(404).json({ msg: 'Origen no encontrado' })
    }

    await origen.update({ activo: false })
    req.app.get('io')?.to('admins').emit('origenes:actualizados')

    return res.json({ msg: 'Origen eliminado correctamente' })
  } catch (error) {
    return manejarError(res, error, 'No se pudo eliminar el origen')
  }
}
