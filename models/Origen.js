import { DataTypes } from 'sequelize'
import db from '../config/db.js'

const Origen = db.define('Origen', {
  nombre: {
    type: DataTypes.STRING(160),
    allowNull: false,
    unique: true
  },
  direccion: {
    type: DataTypes.STRING(220),
    allowNull: true
  },
  latitud: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true
  },
  longitud: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'origenes',
  underscored: true
})

export default Origen
