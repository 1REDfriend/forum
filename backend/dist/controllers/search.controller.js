import { searchRepository } from '../repositories/search.repository.js';
export class SearchController {
    async search(req, res, next) {
        try {
            const query = (req.query.q || '').trim();
            if (!query) {
                res.status(200).json({ forums: [], threads: [] });
                return;
            }
            const results = await searchRepository.search(query);
            res.status(200).json(results);
        }
        catch (error) {
            next(error);
        }
    }
}
export const searchController = new SearchController();
//# sourceMappingURL=search.controller.js.map