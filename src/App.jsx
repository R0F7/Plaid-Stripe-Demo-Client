import React, { useState, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";
import useAxiosCommon from "./hooks/useAxiosCommon";
import { useEffect } from "react";

function App() {
  const [linkToken, setLinkToken] = useState(null);
  const [status, setStatus] = useState("");
  const [processorToken, setProcessorToken] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);

  const axiosCommon = useAxiosCommon();

  // initialize Plaid Link
  const onSuccess = useCallback(
    async (public_token, metadata) => {
      setStatus("Exchanging public token...");
      try {
        const exchangeResp = await axiosCommon.post(
          "/api/exchange-public-token",
          {
            public_token,
          }
        );
        const { access_token } = exchangeResp.data;

        const account_id =
          metadata.accounts && metadata.accounts[0] && metadata.accounts[0].id;

        setSelectedAccount(metadata.accounts ? metadata.accounts[0] : null);

        setStatus("Creating processor token (Plaid -> Stripe)...");
        const procResp = await axiosCommon.post(
          "/api/create-stripe-bank-account-token",
          {
            access_token,
            account_id,
          }
        );

        setProcessorToken(procResp.data.processor_token);
        setStatus("Processor token created. Ready to create Stripe customer.");
      } catch (err) {
        console.error(err);
        setStatus("Error during token exchange / processor token creation.");
      }
    },
    [axiosCommon]
  );

  const onExit = useCallback((err, metadata) => {
    if (err) {
      setStatus("Plaid exited with error");
      console.error("Plaid error:", err);
    } else {
      setStatus("Plaid exited by user");
    }
  }, []);

  const config = { token: linkToken, onSuccess, onExit };
  const { open, ready } = usePlaidLink(config);

  const attachToStripe = async () => {
    try {
      setStatus("Creating Stripe customer and attaching bank account...");
      const r = await axiosCommon.post(
        "/api/create-stripe-customer-with-bank",
        {
          email: "customer@example.com",
          name: "Customer Name",
          processor_token: processorToken,
        }
      );
      setStatus("Stripe customer & bank attached successfully.");
      console.log("stripe attach resp", r.data);
    } catch (err) {
      console.error(err);
      setStatus("Failed to attach bank to Stripe.");
    }
  };

  useEffect(() => {
    if (linkToken && ready) {
      open();
    }
  }, [linkToken, ready, open]);

  const handleLinkFlow = async () => {
    try {
      setStatus("Creating link token...");
      const resp = await axiosCommon.post("/api/create-link-token", {
        userId: "user-123",
      });

      setLinkToken(resp.data.link_token);
      setStatus("Opening Plaid...");
    } catch (err) {
      console.error(err);
      setStatus("Failed to start Plaid connection.");
    }
  };

  return (
    <div className="flex items-center justify-center w-full h-screen">
      <div className="p-6 max-w-md mx-auto bg-white shadow-md rounded-lg">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">
          Plaid + Stripe Demo
        </h2>
        <p className="text-gray-600 mb-4">{status}</p>

        <button
          onClick={handleLinkFlow}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
        >
          Link Bank Account
        </button>

        {processorToken && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800 mb-2">
              Processor token ready: {processorToken}
            </p>
            <button
              onClick={attachToStripe}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition"
            >
              Create Stripe Customer & Attach Bank
            </button>
          </div>
        )}

        {selectedAccount && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
            <strong className="block text-gray-700 mb-1">
              Selected Account:
            </strong>
            <div className="text-gray-600">
              {selectedAccount.name} • {selectedAccount.mask}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

// import React, { useState, useCallback } from "react";
// import { usePlaidLink } from "react-plaid-link";
// import useAxiosCommon from "./hooks/useAxiosCommon";

// function App() {
//   const [linkToken, setLinkToken] = useState(null);
//   const [status, setStatus] = useState("");
//   const [processorToken, setProcessorToken] = useState(null);
//   const [selectedAccount, setSelectedAccount] = useState(null);

//   const axiosCommon = useAxiosCommon();

//   // 1) Fetch link_token from backend
//   const createLinkToken = async () => {
//     setStatus("Creating link token...");
//     try {
//       const resp = await axiosCommon.post("/api/create-link-token", {
//         userId: "user-123",
//       });
//       setLinkToken(resp.data.link_token);
//       setStatus("Link token created. Open Plaid Link.");
//     } catch (err) {
//       console.error(err);
//       setStatus("Failed to create link token.");
//     }
//   };

//   // 2) initialize Plaid Link
//   const onSuccess = useCallback(
//     async (public_token, metadata) => {
//       setStatus("Exchanging public token...");
//       try {
//         const exchangeResp = await axiosCommon.post(
//           "/api/exchange-public-token",
//           {
//             public_token,
//           }
//         );
//         const { access_token } = exchangeResp.data;

//         const account_id =
//           metadata.accounts && metadata.accounts[0] && metadata.accounts[0].id;

//         setSelectedAccount(metadata.accounts ? metadata.accounts[0] : null);

//         setStatus("Creating processor token (Plaid -> Stripe)...");
//         const procResp = await axiosCommon.post(
//           "/api/create-stripe-bank-account-token",
//           {
//             access_token,
//             account_id,
//           }
//         );

//         setProcessorToken(procResp.data.processor_token);
//         setStatus("Processor token created. Ready to create Stripe customer.");
//       } catch (err) {
//         console.error(err);
//         setStatus("Error during token exchange / processor token creation.");
//       }
//     },
//     [axiosCommon]
//   );

//   const onExit = useCallback((err, metadata) => {
//     if (err) {
//       setStatus("Plaid exited with error");
//       console.error("Plaid error:", err);
//     } else {
//       setStatus("Plaid exited by user");
//     }
//   }, []);

//   const config = { token: linkToken, onSuccess, onExit };
//   const { open, ready } = usePlaidLink(config);

//   const attachToStripe = async () => {
//     try {
//       setStatus("Creating Stripe customer and attaching bank account...");
//       const r = await axiosCommon.post(
//         "/api/create-stripe-customer-with-bank",
//         {
//           email: "customer@example.com",
//           name: "Customer Name",
//           processor_token: processorToken,
//         }
//       );
//       setStatus("Stripe customer & bank attached successfully.");
//       console.log("stripe attach resp", r.data);
//     } catch (err) {
//       console.error(err);
//       setStatus("Failed to attach bank to Stripe.");
//     }
//   };

//   return (
//     <div className="flex items-center justify-center w-full h-screen">
//       <div className="p-6 max-w-md mx-auto bg-white shadow-md rounded-lg">
//         <h2 className="text-2xl font-semibold mb-4 text-gray-800">
//           Plaid + Stripe Demo
//         </h2>
//         <p className="text-gray-600 mb-4">{status}</p>

//         <button
//           onClick={createLinkToken}
//           className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
//         >
//           Create Link Token
//         </button>

//         <div className="mt-4">
//           <button
//             onClick={() => open()}
//             disabled={!ready || !linkToken}
//             className={`px-4 py-2 rounded-md transition ${
//               !ready || !linkToken
//                 ? "bg-gray-300 text-gray-500 cursor-not-allowed"
//                 : "bg-green-500 text-white hover:bg-green-600"
//             }`}
//           >
//             Link Bank Account
//           </button>
//         </div>

//         {processorToken && (
//           <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
//             <p className="text-green-800 mb-2">
//               Processor token ready: {processorToken}
//             </p>
//             <button
//               onClick={attachToStripe}
//               className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition"
//             >
//               Create Stripe Customer & Attach Bank
//             </button>
//           </div>
//         )}

//         {selectedAccount && (
//           <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
//             <strong className="block text-gray-700 mb-1">
//               Selected Account:
//             </strong>
//             <div className="text-gray-600">
//               {selectedAccount.name} • {selectedAccount.mask}
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// export default App;
