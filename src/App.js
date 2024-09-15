import { useState, useEffect } from 'react';
import { Buffer } from 'buffer';
import {PinataSDK} from 'pinata';
import { ethers } from 'ethers';
import axios from 'axios';
import OpenAI from "openai";

import Spinner from 'react-bootstrap/Spinner';
import Navigation from './components/Navigation';

import NFT from './abis/NFT.json'

import config from './config.json';

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

    const imageData = await createImage()

    const url = await uploadImage(imageData)

    await mintImage(url)

    setIsWaiting(false)
    setMessage("")
  }

  const createImage = async () => {
    setMessage("Generating Image...")

    const form = new FormData();
    form.append('prompt', description);

    const response = await fetch('https://clipdrop-api.co/text-to-image/v1', {
      method: 'POST',
      headers: {
        'x-api-key': `${process.env.REACT_APP_CLICKDROP_API_KEY}`, 
      },
      body: form,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const blob = await response.blob();

    const url = URL.createObjectURL(blob);

    setImage(url);
    setMessage("Image Generated Successfully!");

    return blob;
  }

  const pinata = new PinataSDK({
    pinataJwt: process.env.REACT_APP_PINATA_JWT,
    pinataGateway: "harlequin-characteristic-hummingbird-431.mypinata.cloud",
  });

  const pinataGateway= "harlequin-characteristic-hummingbird-431.mypinata.cloud"

  var imageCount = 0;

  const uploadImage = async (imageData) => {
    setMessage("Uploading Image...")

    const blob = new Blob([imageData], { type: 'image/jpeg' }); // Adjust MIME type if necessary
    const file = new File([blob], "image" + imageCount++, { type: 'image/jpeg' }); 

    const upload = await pinata.upload.file(file);
    console.log(upload);

    try {
      const upload = await pinata.upload.file(file);
      console.log(upload);
      const url = `https://${pinataGateway}/ipfs/${upload.cid}/?pinataGatewayToken=UhHUR8T7QBjicM5i3ctXsWy89BJ0LHliIaURM3V7j6dhAospZY3pXepcgALAPk9d`;
      setURL(url);
      return url;
    } catch (error) {
      console.error('Error uploading image:', error);
      setMessage("Failed to upload image.");
    }
  }

  const mintImage = async (tokenURI) => {
    setMessage("Waiting for Mint...")

    const signer = await provider.getSigner()
    const transaction = await nft.connect(signer).mint(tokenURI, { value: ethers.utils.parseUnits("0.01", "ether") })
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

      {/* {!isWaiting && url && (
        <p>
          View&nbsp;<a href={url} target="_blank" rel="noreferrer">Metadata</a>
        </p>
      )} */}
    </div>
  );
}

export default App;
