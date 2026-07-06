import jwt from 'jsonwebtoken'
import { Usuario } from '../models/Index.js'

export const protegerRuta = async (req, res, next) => {
  const { authorization } = req.headers

  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ msg: 'Token no proporcionado' })
  }

  try {
    const token = authorization.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'rutacontrol_secret_desarrollo')
    const usuario = await Usuario.findByPk(decoded.id)

    if (!usuario || usuario.estado === 'inactivo') {
      return res.status(401).json({ msg: 'Usuario no autorizado' })
    }

    req.usuario = usuario
    return next()
  } catch {
    return res.status(401).json({ msg: 'Token invalido o expirado' })
  }
}

export const autorizarRoles = (...rolesPermitidos) => (req, res, next) => {
  if (!rolesPermitidos.includes(req.usuario?.rol)) {
    return res.status(403).json({ msg: 'No tienes permisos para esta accion' })
  }

  return next()
}
