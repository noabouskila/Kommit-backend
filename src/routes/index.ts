import { Router, type Router as RouterType } from 'express'
import { getRoot } from '../controllers/rootController.js'
import { getHealth } from '../controllers/healthController.js'
import { getDbHealth } from '../controllers/dbHealthController.js'

const router: RouterType = Router()

router.get('/', getRoot)
router.get('/health', getHealth)
router.get('/db-health', getDbHealth)

export default router
