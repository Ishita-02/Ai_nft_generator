import { useState, useEffect } from 'react';
//import { NFTStorage, File } from 'nft.storage'
import { Buffer } from 'buffer';
import {PinataSDK} from 'pinata';
import { ethers } from 'ethers';
import axios from 'axios';

// Components
import Spinner from 'react-bootstrap/Spinner';
import Navigation from './components/Navigation';

// ABIs
import NFT from './abis/NFT.json'

// Config
import config from './config.json';
// import dotenv from 'dotenv'

// dotenv.config();

function App() {
  const [provider, setProvider] = useState(null)
  const [account, setAccount] = useState(null)
  const [nft, setNFT] = useState(null)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [image, setImage] = useState(null)
  const [url, setURL] = useState(null)

  const [message, setMessage] = useState("")
  const [isWaiting, setIsWaiting] = useState(false)

  const loadBlockchainData = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(provider);
  
      const network = await provider.getNetwork();
  
      console.log("Config:", config);
      console.log("Network:", network);
  
      let nftAddress;
  
      // Check if the network is Ethereum mainnet (chainId: 1)
      if (config[network.chainId]) {
        nftAddress = config[network.chainId].nft?.address;
      } else {
        console.error("Configuration not found for network chainId:", network.chainId);
        return;
      }
  
      if (!nftAddress) {
        console.error("NFT address not found for network chainId:", network.chainId);
        return;
      }
  
      const nft = new ethers.Contract(nftAddress, NFT, provider);
      setNFT(nft);
    } catch (error) {
      console.error("Error loading blockchain data:", error);
    }
  };
  

  const submitHandler = async (e) => {
    e.preventDefault()

    if (name === "" || description === "") {
      window.alert("Please provide a name and description")
      return
    }

    setIsWaiting(true)

    // Call AI API to generate a image based on description
    const imageData = await createImage()

    // Upload image to IPFS (NFT.Storage)
    const url = await uploadImage(imageData)

    // Mint NFT
    await mintImage(url)

    setIsWaiting(false)
    setMessage("")
  }

  const createImage = async () => {
    setMessage("Generating Image...")

    // You can replace this with different model API's

    //api key- lmwr_sk_W9YI92OfqV_eWmQaLd6vabPjBbD2dJD5itRg79vDAcisbMey
    //const URL = `https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2`
    //console.log(process.env.REACT_APP_HUGGING_FACE_API_KEY)
    const apiUrl = 'https://ai-nft-generator-wf18.vercel.app/api/proxy'
    // Send the request
    const resp = await axios(
      apiUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: description,
          aspect_ratio: '1:1'
        })
      }
    );  

    const data = resp.json()
    console.log("data", data)
    const image = data.data[0].asset_url;

    // const base64data = Buffer.from(data).toString('base64')
    // const img = `data:${type};base64,` + base64data // <-- This is so we can render it on the page
    setImage(image)

    return image
  }

  const pinata = new PinataSDK({
    pinataJwt: process.env.REACT_APP_PINATA_JWT,
    pinataGateway: "harlequin-characteristic-hummingbird-431.mypinata.cloud",
  });

  var imageCount = 0;

  const uploadImage = async (imageData) => {
    setMessage("Uploading Image...")

    const file = new File(imageData, "image" + imageCount++);
    const upload = await pinata.upload.file(file);
    console.log(upload);

    // Save the URL
    const url = `https://ipfs.io/ipfs/${upload.cid}/metadata.json`
    setURL(url)

    return url
  }

  const mintImage = async (tokenURI) => {
    setMessage("Waiting for Mint...")

    const signer = await provider.getSigner()
    const transaction = await nft.connect(signer).mint(tokenURI, { value: ethers.utils.parseUnits("1", "ether") })
    await transaction.wait()
  }

  useEffect(() => {
    loadBlockchainData()
  }, [])

  return (
    <div>
      <Navigation account={account} setAccount={setAccount} />

      <div className='form'>
        <form onSubmit={submitHandler}>
          <input type="text" placeholder="Create a name..." onChange={(e) => { setName(e.target.value) }} />
          <input type="text" placeholder="Create a description..." onChange={(e) => setDescription(e.target.value)} />
          <input type="submit" value="Create & Mint" />
        </form>

        <div className="image">
          {!isWaiting && image ? (
            <img src={image} alt="AI generated image" />
          ) : isWaiting ? (
            <div className="image__placeholder">
              <Spinner animation="border" />
              <p>{message}</p>
            </div>
          ) : (
            <></>
          )}
        </div>
      </div>

      {!isWaiting && url && (
        <p>
          View&nbsp;<a href={url} target="_blank" rel="noreferrer">Metadata</a>
        </p>
      )}
    </div>
  );
}

export default App;
