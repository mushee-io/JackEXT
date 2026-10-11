export default function handler(_req,res){res.status(200).json({ok:true,service:"JackEXT",liveProviderConfigured:Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET)});}
