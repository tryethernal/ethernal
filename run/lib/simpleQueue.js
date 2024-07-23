class SimpleQueue {
    constructor() {
        this.items = [];
    }
  
    enqueue(element) {
        this.items.push(element);
    }
  
    dequeue() {
        if (this.isEmpty()) return "Underflow";
        return this.items.shift();
    }
  
    front() {
        if (this.isEmpty()) return "No elements in Queue";
        return this.items[0];
    }
  
    isEmpty() {
        return this.items.length === 0;
    }
}

module.exports = SimpleQueue;
  