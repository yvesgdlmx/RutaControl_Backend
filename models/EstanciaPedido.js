import { DataTypes } from 'sequelize'
import db from '../config/db.js'

const EstanciaPedido = db.define('EstanciaPedido', {
  llegadaAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  salidaAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  duracionSegundos: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'estancias_pedidos',
  underscored: true
})

export default EstanciaPedido
