const Router = require('express')
const userController = require('../controllers/userController')
const router = new Router()
const authMiddleware = require('../middleware/AuthMiddleware')
const checkRoleMiddleware = require('../middleware/CheckRoleMiddleware')

router.get('/', checkRoleMiddleware('ADMIN'), userController.getAll)
router.get('/auth', authMiddleware, userController.check)
router.get('/:id', checkRoleMiddleware('ADMIN'), userController.getOne)
router.put('/:id', userController.updateImage)
router.put('/', userController.updateUser)
router.patch('/update/:id', userController.updateToken)
router.post('/signin', userController.login)
router.post('/signup', userController.register)
router.patch('/confirm', userController.confirm)
router.post('/sales', userController.getWBData)
// router.patch('/reset-password', userController.confirm)


module.exports = router