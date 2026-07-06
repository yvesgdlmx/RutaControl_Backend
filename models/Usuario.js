import { DataTypes } from 'sequelize'
import bcrypt from 'bcrypt'
import db from '../config/db.js'

const Usuario = db.define('Usuario', {
  nombre: {
    type: DataTypes.STRING(120),
    allowNull: false
  },
  correo: {
    type: DataTypes.STRING(160),
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  telefono: {
    type: DataTypes.STRING(30),
    allowNull: true
  },
  rol: {
    type: DataTypes.ENUM('administrador', 'chofer'),
    allowNull: false
  },
  estado: {
    type: DataTypes.ENUM('activo', 'inactivo', 'descanso'),
    allowNull: false,
    defaultValue: 'activo'
  },
  vehiculo: {
    type: DataTypes.STRING(120),
    allowNull: true
  }
}, {
  tableName: 'usuarios',
  underscored: true,
  defaultScope: {
    attributes: { exclude: ['password'] }
  },
  scopes: {
    conPassword: {
      attributes: { include: ['password'] }
    }
  },
  hooks: {
    beforeCreate: async (usuario) => {
      if (usuario.password) {
        usuario.password = await bcrypt.hash(usuario.password, 10)
      }
    },
    beforeUpdate: async (usuario) => {
      if (usuario.changed('password') && usuario.password) {
        usuario.password = await bcrypt.hash(usuario.password, 10)
      }
    }
  }
})

Usuario.prototype.comprobarPassword = function comprobarPassword(passwordFormulario) {
  return bcrypt.compare(passwordFormulario, this.password)
}

export default Usuario
