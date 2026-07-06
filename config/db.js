import mysql from 'mysql2/promise'
import Sequelize from 'sequelize'
import dotenv from 'dotenv'
dotenv.config({ path: '.env' })

const nombreBD = process.env.DB_NAME || process.env.BD_NOMBRE || 'rutacontrol'
const usuarioBD = process.env.DB_USER || process.env.BD_USER || 'root'
const passwordBD = process.env.DB_PASSWORD ?? process.env.BD_PASS ?? ''
const hostBD = process.env.DB_HOST || process.env.BD_HOST || 'localhost'
const puertoBD = process.env.DB_PORT || 3306
const zonaHorariaBD = process.env.DB_TIMEZONE || '-06:00'

async function asegurarBaseDatos() {
  const conexion = await mysql.createConnection({
    host: hostBD,
    port: puertoBD,
    user: usuarioBD,
    password: passwordBD
  })

  await conexion.query(`CREATE DATABASE IF NOT EXISTS \`${nombreBD}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  await conexion.end()
}

const sequelize = new Sequelize(
  nombreBD,
  usuarioBD,
  passwordBD,
  {
    host: hostBD,
    port: puertoBD,
    dialect: 'mysql',
    timezone: zonaHorariaBD,
    define: {
      timestamps: true
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 60000,
      idle: 10000
    },
    operatorAliases: false,
    dialectOptions: {
      connectTimeout: 60000,
      timezone: zonaHorariaBD
    },
    logging: false,
    retry: {
      max: 3
    }
  }
)

export async function conectarBD() {
  await asegurarBaseDatos()
  await sequelize.authenticate()
  console.log('Conexion correcta a la base de datos')
}

export default sequelize
