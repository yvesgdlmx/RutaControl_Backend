import jwt from 'jsonwebtoken'

const generarJWT = (usuario) => jwt.sign(
  {
    id: usuario.id,
    rol: usuario.rol
  },
  process.env.JWT_SECRET || 'rutacontrol_secret_desarrollo',
  { expiresIn: '3d' }
)

export default generarJWT
