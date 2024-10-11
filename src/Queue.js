class Queue {
    constructor() {
        this.items = [];
        this.frontIndex = 0;
        this.backIndex = 0;
    }

    enqueue(item) {
        this.items[this.backIndex++] = item;
        return item;
    }

    dequeue() {
        if (this.isEmpty()) {
            return null;
        }
        const item = this.items[this.frontIndex];
        delete this.items[this.frontIndex++];
        return item;
    }

    peek() {
        if (this.isEmpty()) {
            return null;
        }
        return this.items[this.frontIndex];
    }

    isEmpty() {
        return this.frontIndex === this.backIndex;
    }

    length() {
        return this.backIndex - this.frontIndex;
    }

    clear() {
        this.items = [];
        this.frontIndex = 0;
        this.backIndex = 0;
    }

    getQueue() {
        return this.items;
    }
}

module.exports = Queue;
