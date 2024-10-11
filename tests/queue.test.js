// Import the Queue class
const Queue = require('../src/Queue.js');

// Unit tests using Jest
describe('Queue', () => {
  let queue;

  beforeEach(() => {
    queue = new Queue();
  });

  test('should enqueue items correctly', () => {
    queue.enqueue('item1');
    queue.enqueue('item2');
    queue.enqueue('item3');
    expect(queue.length()).toBe(3);
    expect(queue.peek()).toBe('item1');
  });

  test('should dequeue items correctly', () => {
    queue.enqueue('item1');
    queue.enqueue('item2');
    expect(queue.dequeue()).toBe('item1');
    expect(queue.length()).toBe(1);
    expect(queue.peek()).toBe('item2');
  });

  test('should return null when dequeuing an empty queue', () => {
    expect(queue.dequeue()).toBeNull();
  });

  test('should return the correct front item with peek', () => {
    queue.enqueue('item1');
    queue.enqueue('item2');
    expect(queue.peek()).toBe('item1');
  });

  test('should return null when peeking an empty queue', () => {
    expect(queue.peek()).toBeNull();
  });

  test('should correctly report if the queue is empty', () => {
    expect(queue.isEmpty()).toBe(true);
    queue.enqueue('item1');
    expect(queue.isEmpty()).toBe(false);
  });

  test('should return the correct length of the queue', () => {
    expect(queue.length()).toBe(0);
    queue.enqueue('item1');
    queue.enqueue('item2');
    expect(queue.length()).toBe(2);
    queue.dequeue();
    expect(queue.length()).toBe(1);
  });

  test('should clear the queue', () => {
    queue.enqueue('item1');
    queue.enqueue('item2');
    queue.clear();
    expect(queue.length()).toBe(0);
    expect(queue.isEmpty()).toBe(true);
  });

  test('should return the correct queue items', () => {
    queue.enqueue('item1');
    queue.enqueue('item2');
    expect(queue.getQueue()).toEqual(['item1', 'item2']);
  });
});