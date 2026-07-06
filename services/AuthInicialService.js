import { Usuario } from '../models/Index.js'

const asegurarAdministradorInicial = async () => {
  const correo = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD

  if (!correo || !password) {
    console.log('Admin inicial no creado: configura ADMIN_EMAIL y ADMIN_PASSWORD en .env.')
    return
  }

  const administrador = await Usuario.scope(null).findOne({ where: { correo } })

  if (!administrador) {
    await Usuario.create({
      nombre: process.env.ADMIN_NAME || 'Admin Optimex',
      correo,
      password,
      rol: 'administrador',
      estado: 'activo'
    })

    return
  }

  if (!administrador.password) {
    await administrador.update({ password, estado: 'activo' })
  }
}

export default {
  asegurarAdministradorInicial
}
