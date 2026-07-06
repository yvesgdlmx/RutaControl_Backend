import { DataTypes } from 'sequelize'
import db from '../config/db.js'

const Pedido = db.define('Pedido', {
  folio: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  areaSolicitante: {
    type: DataTypes.STRING(120),
    allowNull: false
  },
  prioridad: {
    type: DataTypes.ENUM('Baja', 'Media', 'Alta'),
    allowNull: false,
    defaultValue: 'Media'
  },
  estado: {
    type: DataTypes.ENUM('Pendiente', 'Asignado', 'En camino', 'En sitio', 'Comprado', 'Entregado', 'Cancelado'),
    allowNull: false,
    defaultValue: 'Pendiente'
  },
  origen: {
    type: DataTypes.STRING(180),
    allowNull: true
  },
  destino: {
    type: DataTypes.STRING(180),
    allowNull: true
  },
  destinoLatitud: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true
  },
  destinoLongitud: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true
  },
  usuarioSolicitante: {
    type: DataTypes.STRING(120),
    allowNull: true
  }
}, {
  tableName: 'pedidos',
  underscored: true
})

export default Pedido
