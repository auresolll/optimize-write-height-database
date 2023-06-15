import express from "express";
import { Request, Response } from "express";

const app = express();

function throttle<Args extends unknown[]>(
  fn: (...args: Args) => void,
  cooldown: number
) {
  let lastArgs: Args | undefined;

  const run = () => {
    if (lastArgs) {
      fn(...lastArgs);
      lastArgs = undefined;
    }
  };

  const throttled = (...args: Args) => {
    const isOnCooldown = !!lastArgs;

    lastArgs = args;

    if (isOnCooldown) {
      return;
    }

    setTimeout(run, cooldown);
  };

  throttled.flush = () => {
    clearTimeout(cooldown);
    run();
  };
  return throttled;
}

const Bulker = (size, timeout, batchFunc) => {
  let batch = [];
  let counter = 0;

  const execBatchFunc = async () => {
    const tmp = batch;
    batch = [];

    await batchFunc(tmp);
    counter += tmp.length;
    console.log(`Processed ${tmp.length} records`);
  };

  const throttledFunc = throttle(execBatchFunc, timeout);

  return {
    push(item: any) {
      batch.push(item);
      if (batch.length >= size) {
        this.flush();
      } else {
        console.log(batch);

        throttledFunc();
      }
    },

    async flush() {
      return throttledFunc.flush();
    },

    getCounter() {
      return counter;
    },
  };
};

const insertBulker = Bulker(2, 1000, async (items) => {
  console.log("INSERT IN TO DATABASE");
});

app.get("/", async (req: Request, res: Response) => {
  for (let i = 0; i < 5; i++) {
    insertBulker.push({
      id: i,
      title: "My awesome test",
      description: "This is a test",
    });
  }
  res.send("ok");
});

app.listen(3000, () => {
  console.log("Application started on port 3000!");
});
