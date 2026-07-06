import { DataTypes } from 'sequelize'
import db from '../config/db.js'

const ConfiguracionSistema = db.define('ConfiguracionSistema', {
  clave: {
    type: DataTypes.STRING(80),
    allowNull: false,
    unique: true
  },
  etiqueta: {
    type: DataTypes.STRING(120),
    allowNull: false
  },
  valor: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tipo: {
    type: DataTypes.ENUM('texto', 'numero', 'booleano'),
    allowNull: false,
    defaultValue: 'texto'
  },
  grupo: {
    type: DataTypes.STRING(80),
    allowNull: false,
    defaultValue: 'general'
  },
  descripcion: {
    type: DataTypes.STRING(220),
    allowNull: true
  }
}, {
  tableName: 'configuracion_sistema',
  underscored: true
})

export default ConfiguracionSistema
