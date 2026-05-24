const API_URL = 'http://localhost:3636';

async function request(endpoint, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_URL}${endpoint}`, options);
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function runTests() {
  console.log('--- Starting API Tests ---');

  // 1. Register
  console.log('\n[1] Testing Register (POST /auth/register)');
  const registerRes = await request('/auth/register', 'POST', {
    name: 'Test User',
    email: `test${Date.now()}@example.com`,
    password: 'password123'
  });
  console.log('Status:', registerRes.status);
  console.log('Response:', registerRes.data);
  const token = registerRes.data?.token;

  if (!token) {
    console.error('Failed to get token. Stopping tests.');
    return;
  }

  // 2. Create Forum
  console.log('\n[2] Testing Create Forum (POST /forums)');
  const createForumRes = await request('/forums', 'POST', {
    name: 'General Discussion',
    description: 'A place to discuss anything.'
  }, token);
  console.log('Status:', createForumRes.status);
  console.log('Response:', createForumRes.data);
  const forumId = createForumRes.data?.id;

  // 3. Get Forums
  console.log('\n[3] Testing Get Forums (GET /forums)');
  const getForumsRes = await request('/forums', 'GET');
  console.log('Status:', getForumsRes.status);
  console.log('Response:', getForumsRes.data);

  if (!forumId) {
    console.error('Failed to create forum. Stopping tests.');
    return;
  }

  // 4. Create Thread
  console.log('\n[4] Testing Create Thread (POST /threads)');
  const createThreadRes = await request('/threads', 'POST', {
    title: 'My First Thread',
    content: 'Hello everyone!',
    forumId: forumId
  }, token);
  console.log('Status:', createThreadRes.status);
  console.log('Response:', createThreadRes.data);
  const threadId = createThreadRes.data?.id;

  // 5. Get Threads
  console.log('\n[5] Testing Get Threads (GET /threads)');
  const getThreadsRes = await request('/threads', 'GET');
  console.log('Status:', getThreadsRes.status);
  console.log('Response:', getThreadsRes.data);

  if (!threadId) {
    console.error('Failed to create thread. Stopping tests.');
    return;
  }

  // 6. Create Post (Comment)
  console.log('\n[6] Testing Create Post (POST /posts)');
  const createPostRes = await request('/posts', 'POST', {
    content: 'This is a reply to the thread!',
    threadId: threadId
  }, token);
  console.log('Status:', createPostRes.status);
  console.log('Response:', createPostRes.data);

  // 7. Get Posts by Thread
  console.log(`\n[7] Testing Get Posts by Thread (GET /posts/thread/${threadId})`);
  const getPostsRes = await request(`/posts/thread/${threadId}`, 'GET');
  console.log('Status:', getPostsRes.status);
  console.log('Response:', getPostsRes.data);

  console.log('\n--- Tests Completed ---');
}

runTests().catch(console.error);
