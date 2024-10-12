// Import the Queue class
const Queue = require("../src/Queue.js");

// Unit tests using Jest
describe("Queue", () => {
  let queue;

  beforeEach(() => {
    queue = new Queue();
  });

  test("queue.enqueue()", () => {
    queue.enqueue("item1");
    queue.enqueue("item2");
    queue.enqueue("item3");
    expect(queue.length()).toBe(3);
    expect(queue.peek()).toBe("item1");
  });

  test("queue.dequeue()", () => {
    queue.enqueue("item1");
    queue.enqueue("item2");
    expect(queue.dequeue()).toBe("item1");
    expect(queue.length()).toBe(1);
    expect(queue.peek()).toBe("item2");
  });

  test("dequeuing empty queue", () => {
    expect(queue.dequeue()).toBeNull();
  });

  test("queue.peek()", () => {
    queue.enqueue("item1");
    queue.enqueue("item2");
    expect(queue.peek()).toBe("item1");
  });

  test("peeking an empty queue", () => {
    expect(queue.peek()).toBeNull();
  });

  test("queue.isEmpty()", () => {
    expect(queue.isEmpty()).toBe(true);
    queue.enqueue("item1");
    expect(queue.isEmpty()).toBe(false);
  });

  test("queue.length()", () => {
    expect(queue.length()).toBe(0);
    queue.enqueue("item1");
    queue.enqueue("item2");
    expect(queue.length()).toBe(2);
    queue.dequeue();
    expect(queue.length()).toBe(1);
  });

  test("queue.clear()", () => {
    queue.enqueue("item1");
    queue.enqueue("item2");
    queue.clear();
    expect(queue.length()).toBe(0);
    expect(queue.isEmpty()).toBe(true);
  });

  test("queue.getQueue()", () => {
    queue.enqueue("item1");
    queue.enqueue("item2");
    expect(queue.getQueue()).toEqual(["item1", "item2"]);
  });
});
