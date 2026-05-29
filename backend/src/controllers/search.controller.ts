import type { Request, Response, NextFunction } from 'express';
import { searchRepository } from '../repositories/search.repository.js';

export class SearchController {
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const query = (req.query.q as string || '').trim();
      if (!query) {
        res.status(200).json({ forums: [], threads: [] });
        return;
      }
      const results = await searchRepository.search(query);
      res.status(200).json(results);
    } catch (error) {
      next(error);
    }
  }
}

export const searchController = new SearchController();
