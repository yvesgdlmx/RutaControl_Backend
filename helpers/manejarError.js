const manejarError = (res, error, msg = 'Ocurrio un error inesperado') => {
  console.error(error)
  return res.status(500).json({ msg, detalle: error.message })
}

export default manejarError
