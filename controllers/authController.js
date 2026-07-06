import { Usuario } from '../models/Index.js'
import generarJWT from '../helpers/generarJWT.js'
import manejarError from '../helpers/manejarError.js'

const construirRespuestaUsuario = (usuario) => ({
  id: usuario.id,
  nombre: usuario.nombre,
  correo: usuario.correo,
  telefono: usuario.telefono,
  rol: usuario.rol,
  estado: usuario.estado,
  vehiculo: usuario.vehiculo
})

export const iniciarSesion = async (req, res) => {
  try {
    const correo = req.body.correo?.trim().toLowerCase()
    const { password } = req.body

    if (!correo || !password) {
      return res.status(400).json({ msg: 'Correo y contrasena son obligatorios' })
    }

    const usuario = await Usuario.scope(null).findOne({ where: { correo } })

    if (!usuario || !usuario.password) {
      return res.status(401).json({ msg: 'Credenciales incorrectas' })
    }

    if (usuario.estado === 'inactivo') {
      return res.status(403).json({ msg: 'Usuario inactivo' })
    }

    const passwordCorrecto = await usuario.comprobarPassword(password)

    if (!passwordCorrecto) {
      return res.status(401).json({ msg: 'Credenciales incorrectas' })
    }

    return res.json({
      token: generarJWT(usuario),
      usuario: construirRespuestaUsuario(usuario)
    })
  } catch (error) {
    return manejarError(res, error, 'No se pudo iniciar sesion')
  }
}

export const obtenerPerfil = async (req, res) => {
  res.json({ usuario: construirRespuestaUsuario(req.usuario) })
}
