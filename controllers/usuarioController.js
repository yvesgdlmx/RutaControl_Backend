import { Usuario } from '../models/Index.js'
import manejarError from '../helpers/manejarError.js'

const construirRespuestaUsuario = (usuario) => ({
  id: usuario.id,
  nombre: usuario.nombre,
  correo: usuario.correo,
  telefono: usuario.telefono,
  rol: usuario.rol,
  estado: usuario.estado,
  vehiculo: usuario.vehiculo,
  createdAt: usuario.createdAt,
  updatedAt: usuario.updatedAt
})

export const obtenerUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.findAll({
      order: [['createdAt', 'DESC']]
    })

    return res.json({ usuarios })
  } catch (error) {
    return manejarError(res, error, 'No se pudieron obtener los usuarios')
  }
}

export const crearUsuario = async (req, res) => {
  try {
    if (!req.body.password || req.body.password.length < 6) {
      return res.status(400).json({ msg: 'La contrasena debe tener al menos 6 caracteres' })
    }

    const usuario = await Usuario.create({
      ...req.body,
      correo: req.body.correo?.trim().toLowerCase()
    })
    req.app.get('io')?.to('admins').emit('usuarios:actualizados')
    req.app.get('io')?.to('admins').emit('choferes:actualizados')

    return res.status(201).json({ msg: 'Usuario creado correctamente', usuario: construirRespuestaUsuario(usuario) })
  } catch (error) {
    return manejarError(res, error, 'No se pudo crear el usuario')
  }
}

export const actualizarUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id)

    if (!usuario) {
      return res.status(404).json({ msg: 'Usuario no encontrado' })
    }

    const datosUsuario = {
      ...req.body,
      correo: req.body.correo?.trim().toLowerCase()
    }

    if (!datosUsuario.password) {
      delete datosUsuario.password
    } else if (datosUsuario.password.length < 6) {
      return res.status(400).json({ msg: 'La contrasena debe tener al menos 6 caracteres' })
    }

    await usuario.update(datosUsuario)
    req.app.get('io')?.to('admins').emit('usuarios:actualizados')
    req.app.get('io')?.to('admins').emit('choferes:actualizados')

    return res.json({ msg: 'Usuario actualizado correctamente', usuario: construirRespuestaUsuario(usuario) })
  } catch (error) {
    return manejarError(res, error, 'No se pudo actualizar el usuario')
  }
}

export const eliminarUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id)

    if (!usuario) {
      return res.status(404).json({ msg: 'Usuario no encontrado' })
    }

    await usuario.destroy()
    req.app.get('io')?.to('admins').emit('usuarios:actualizados')
    req.app.get('io')?.to('admins').emit('choferes:actualizados')

    return res.json({ msg: 'Usuario eliminado correctamente' })
  } catch (error) {
    return manejarError(res, error, 'No se pudo eliminar el usuario')
  }
}
