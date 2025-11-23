import React, { useState, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";
import useAxiosCommon from "./hooks/useAxiosCommon";
import { useEffect } from "react";

function App() {
  const [linkToken, setLinkToken] = useState(null);
  const [status, setStatus] = useState("");
  const [processorToken, setProcessorToken] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [user, setUser] = useState({});
  const [showModal, setShowModal] = useState(false);

  const axiosCommon = useAxiosCommon();

  // initialize Plaid Link
  // const onSuccess = useCallback(
  //   async (public_token, metadata) => {
  //     setStatus("Exchanging public token...");
  //     try {
  //       const exchangeResp = await axiosCommon.post(
  //         "/api/exchange-public-token",
  //         {
  //           public_token,
  //         }
  //       );
  //       const { access_token } = exchangeResp.data;

  //       const account_id =
  //         metadata.accounts && metadata.accounts[0] && metadata.accounts[0].id;

  //       setSelectedAccount(metadata.accounts ? metadata.accounts[0] : null);

  //       setStatus("Creating processor token (Plaid -> Stripe)...");
  //       const procResp = await axiosCommon.post(
  //         "/api/create-stripe-bank-account-token",
  //         {
  //           access_token,
  //           account_id,
  //         }
  //       );

  //       setProcessorToken(procResp.data.processor_token);
  //       setStatus("Processor token created. Ready to create Stripe customer.");
  //     } catch (err) {
  //       console.error(err);
  //       setStatus("Error during token exchange / processor token creation.");
  //     }
  //   },
  //   [axiosCommon]
  // );

  const onSuccess = useCallback(
    async (public_token, metadata) => {
      setStatus("Exchanging public token...");

      try {
        // 1) Exchange token
        const exchangeResp = await axiosCommon.post(
          "/api/exchange-public-token",
          { public_token }
        );

        const { access_token } = exchangeResp.data;

        // 2) Get selected account id
        const account_id = metadata?.accounts?.[0]?.id;
        setSelectedAccount(metadata.accounts[0]);

        // 3) Create processor token
        setStatus("Creating processor token (Plaid -> Stripe)...");

        // console.log(access_token,account_id);
        const procResp = await axiosCommon.post(
          "/api/create-stripe-bank-account-token",
          {
            access_token,
            account_id,
          }
        );

        // FIX: backend now returns processor_token
        setProcessorToken(procResp.data.processor_token);
        setShowModal(true);

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
          email: user?.email || "customer@example.com",
          name: user?.name || "Customer Name",
          processor_token: processorToken,
        }
      );
      setStatus("Stripe customer & bank attached successfully.");
      // console.log("stripe attach resp", r.data);
      setShowModal(false);
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

  const handleLinkFlow = async (e) => {
    e.preventDefault();

    const form = e.target;
    const name = form.name.value;
    const email = form.email.value;

    setUser({ name, email });

    try {
      setStatus("Creating link token...");
      const resp = await axiosCommon.post("/api/create-link-token", {
        userId: email || "user-123",
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
      <div className="p-6 w-[370px] max-w-xl mx-auto bg-white shadow rounded-lg">
        <form onSubmit={handleLinkFlow} className="space-y-4">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 text-center">
            Verify your bank instant
          </h2>

          <div className="grid gap-1">
            <label htmlFor="name" className="text-sm w-fit">
              Name
            </label>
            <input
              type="text"
              name="name"
              id="name"
              placeholder="Enter your name"
              className="border border-zinc-300 w-full rounded-md py-2 px-2 text-sm outline-none"
              required
            />
          </div>

          <div className="grid gap-1">
            <label htmlFor="email" className="text-sm w-fit">
              Email
            </label>
            <input
              type="email"
              name="email"
              id="email"
              placeholder="Enter your email"
              className="border border-zinc-300 w-full rounded-md py-2 px-2 text-sm outline-none"
              required
            />
          </div>

          <p className="text-gray-600 my-1.5 text-sm">{status}</p>
          <button
            type="submit"
            className="bg-blue-600 w-full text-white text-sm px-4 py-2.5 rounded-md hover:bg-blue-700 transition"
          >
            Link Your Bank Account
          </button>
        </form>

        {showModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-[90%] max-w-md p-6 relative">
              {/* Close Button */}
              <button
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-xl"
                onClick={() => setShowModal(false)}
              >
                &times;
              </button>

              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Bank Account Linked!
              </h2>

              <p className="text-green-700 text-sm bg-green-50 border border-green-200 px-3 py-2 rounded">
                Processor token ready: <br />
                <span className="font-mono">{processorToken}</span>
              </p>

              <button
                onClick={attachToStripe}
                className="mt-5 w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition"
              >
                Create Stripe Customer & Attach Bank
              </button>
            </div>
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
