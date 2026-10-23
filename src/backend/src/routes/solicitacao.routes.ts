import { Router } from 'express';
import { SolicitacaoController } from '../controllers/SolicitacaoController';
import { authorize } from '../middlewares/auth';

const router = Router();

router.get('/', SolicitacaoController.findAll);
router.get('/:id', SolicitacaoController.findById);
router.post('/', SolicitacaoController.create);
router.put('/:id', authorize('gestor', 'responsavel'), SolicitacaoController.update);
router.patch('/:id/status', authorize('gestor', 'responsavel'), SolicitacaoController.updateStatus);
router.delete('/:id', authorize('gestor', 'responsavel'), SolicitacaoController.delete);

export default router;
