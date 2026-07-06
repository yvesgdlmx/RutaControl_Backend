import { DataTypes } from 'sequelize'
import db from '../config/db.js'

const RutaPedido = db.define('RutaPedido', {
  orden: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  }
}, {
  tableName: 'rutas_pedidos',
  underscored: true
})

export default RutaPedido
