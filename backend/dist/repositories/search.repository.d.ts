export declare class SearchRepository {
    search(query: string, limit?: number): Promise<{
        forums: {
            id: number;
            name: string;
            description: string | null;
            type: string;
        }[];
        threads: {
            id: number;
            title: string;
            content: string;
            authorName: string;
            forumName: string;
            forumId: number;
            type: string;
        }[];
    }>;
}
export declare const searchRepository: SearchRepository;
//# sourceMappingURL=search.repository.d.ts.map