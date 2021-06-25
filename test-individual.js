const got = require(`got`)
const Request = require(`got/dist/source/core`).default
const HttpAgent = require( "agentkeepalive")
const contentList = require(`./content-list.json`)
const http2wrapper = require(`http2-wrapper`)

const { HttpsAgent } = HttpAgent

const agent = {
  http: new HttpAgent(),
  https: new HttpsAgent(),
  // http2: new http2wrapper.Agent(),
}

// const Inspector = require(`inspector-api`)
// const inspector = new Inspector({ storage: { type: `fs` } })

let start = Date.now()
let urlCount = 0
let lastBatch
function worker([url, options = {}]) {
  if (!url) {
    return
  }

  if (!lastBatch) lastBatch = Date.now()
  urlCount += 1
  if (urlCount % 500 === 0) {
    console.log({
      urlCount,
      rate: 500 / ((Date.now() - lastBatch) / 1000),
      queueLength: requestQueue.length(),
    })
    lastBatch = Date.now()
  }
  

  const stream = new Request(url, {
    agent,
    responseType: `json`,
    timeout: 15000,
    // request: http2wrapper.auto,
    // http2: true,
    cache: false,
    retry: 3,
    hooks: {
      beforeRetry: [
        (options, error) => {
          console.log(`Retrying...`, {
            url,
            errorStatusCode: error.response?.statusCode,
            error,
          })
        },
      ],
    },
    // request: http2wrapper.auto,
    // http2: true,
  })

  return new Promise(resolve => {
    stream.resume().once('end', () => {
			resolve();
		});
  })
} 

const requestQueue = require(`fastq`).promise(worker, 30)

requestQueue.drain = async () => {
  console.log(`queue drained`)
  console.log(`time`, Date.now() - start)
  // await inspector.profiler.stop()
  // await inspector.heap.stopSampling();
}
requestQueue.empty = () => console.log(`queue emptied`)
requestQueue.saturated = () => console.log(`queue saturated`)

function makeUrl (type, id) {
  return `https://live-sonesta-8.pantheonsite.io/jsonapi/${type.split(`--`).join(`/`)}/${id}`
}
async function run() {
  // await inspector.profiler.enable()
  // await inspector.profiler.start()
  // await inspector.heap.enable();
  // await inspector.heap.startSampling();
  Object.keys(contentList).forEach(type => {
    contentList[type].forEach(id => {
      requestQueue.push([makeUrl(type, id)], (err, res) => {
        // console.log(`hi`)
        // console.log(err, res)
      })
    })
  })

}

run()

process.on('uncaughtExceptionMonitor', (err, origin) => {
  console.log(err)
});
