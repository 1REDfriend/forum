import { test, expect, mock } from 'bun:test';

mock.module('../repositories/thread.repository.js', () => ({
  threadRepository: {
    findById: async (_id: string) => ({
      id: 'abc',
      title: 'A Thread',
      content: 'thread body text',
      author: { name: 'Bob', banner: 'https://cdn.example/author-banner.png' },
      forum: { name: 'General' },
    }),
  },
}));

test('thread share card always uses the default site OG image, even when the author has a banner', async () => {
  const { shareService } = await import('./share.service.js');
  const html = await shareService.threadOg('abc');
  expect(html).not.toBeNull();
  expect(html!).toContain('/og-default.png');
  expect(html!).not.toContain('author-banner.png');
});
