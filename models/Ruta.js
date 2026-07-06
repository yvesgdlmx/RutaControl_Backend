import { DataTypes } from 'sequelize'
import db from '../config/db.js'

const Ruta = db.define('Ruta', {
  codigo: {
    type: DataTypes.STRING(40),
    allowNull: false,
    unique: true
  },
  estado: {
    type: DataTypes.ENUM('Programada', 'Activa', 'Finalizada', 'Cancelada'),
    allowNull: false,
    defaultValue: 'Programada'
  },
  vehiculo: {
    type: DataTypes.STRING(120),
    allowNull: true
  },
  progreso: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  eta: {
    type: DataTypes.STRING(60),
    allowNull: true
  },
  fechaInicio: {
    type: DataTypes.DATE,
    allowNull: true
  },
  fechaFin: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'rutas',
  underscored: true
})

export default Ruta
