import { exolix} from "../src";
jest.setTimeout(1000000000);
const key= ""
test("major test", async () => {
  const b = new exolix(
    {
      apiKey:key
    }
  )
  console.log(b)
  const rate = await b.getRate({
      coinFrom: "XMR",
      coinTo: "BTC",
      rateType:"fixed",
      amount:1
  } as any)
  console.log(rate)



  // const tx = await b.createTransaction(
  //   {
  //       coinFrom: "XMR",
  //       networkFrom: "XMR",
  //       coinTo: "USDT",
  //       networkTo: "SOL",
  //       amount: 1,
  //       rateType: "float",
  //       withdrawalAddress:"AoJYmgo3fFeVwpH1RAGaGD8BRZHtMthD3S4NTKgXoAWr"
  //   } as any
  // )
  // console.log(tx)
  return 0;
})