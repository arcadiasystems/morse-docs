> Source: https://docs.morsecms.xyz/uploader.html · Full docs: https://docs.morsecms.xyz/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/arcadiasystems/morse-dcms/issues/new?labels=docs-feedback

# React Uploader

> `@arcadiasystems/morse-uploader` gives React apps drop-in components and hooks for Morse recipient files. Upload a file to Walrus, optionally encrypt it for a list of wallets, and share a link. The connected wallet pays for and signs everything.

> **WARNING: Network status**
>
> Morse runs on **Walrus Mainnet and testnet**. On mainnet, gas and Walrus storage cost real SUI and WAL, and there is no faucet. Test on testnet first, and read [Walrus Mainnet](https://docs.morsecms.xyz/mainnet.html) before you switch. Sui and Walrus testnets reset periodically (Walrus wipes every few months), so stored content and object IDs are lost on reset. Do not publish anything you cannot afford to lose.

## What it is

The package wraps the [recipient file](https://docs.morsecms.xyz/recipient-files.html) flow of `morse-sdk` 0.9 or 0.10 for React. Each upload creates a `RecipientFile`: a Walrus blob plus an on-chain record that carries its own recipient set. Every step is a headless hook, and an optional set of styled components sits on top.

- **Headless hooks**: One hook per step: setup, upload, download, decrypt, file metadata and storage cost.
- **Drop-in components**: MorseFileUploader and MorseFileDownloader, themed with CSS variables.
- **Two wallet popups**: Any upload, public or encrypted, takes two wallet popups, whatever the number of recipients.
- **Share links**: A link carries the file ID, the network and the Seal material in the URL fragment, so none of it reaches a server log.
- **Your wallet stack**: You pass in the network and the wallet callbacks. Wallet connection stays in your app.

The package is ESM only and has four entry points:

| Import path | Contents |
| --- | --- |
| `@arcadiasystems/morse-uploader` | The setup hook, the provider, the headless hooks, and the share-link and cost helpers. |
| `@arcadiasystems/morse-uploader/ui` | The styled components: `MorseFileUploader` and `MorseFileDownloader`. |
| `@arcadiasystems/morse-uploader/styles.css` | The stylesheet for the styled components. |
| `@arcadiasystems/morse-uploader/wallet-standard` | `WalletStandardAdapter`, an optional browser `WalletAdapter` backed by a sign-and-execute callback. |

## Install

The package is on npm as [`@arcadiasystems/morse-uploader`](https://www.npmjs.com/package/@arcadiasystems/morse-uploader). This page covers version 0.4.1. Install it with its peer dependencies:

```bash
npm install @arcadiasystems/morse-uploader@~0.4.1 @arcadiasystems/morse-sdk@~0.10.0 @mysten/sui@2.36.0 @mysten/walrus@1.2.35 @mysten/seal@1.5.0
```

The `@mysten/*` peers are pinned to exact versions because newer `@mysten/seal` and `@mysten/walrus` patch releases need a newer `@mysten/sui` than the SDK supports. Keep the peers inside the ranges below, so your app does not end up with two copies of the Sui, Walrus or Seal packages. A tilde range such as `~0.10.0` means `>=0.10.0 <0.11.0`, so the command above stays inside them. React and React DOM are assumed to be in your app already.

| Peer dependency | Range |
| --- | --- |
| `@arcadiasystems/morse-sdk` | >=0.9.0 <0.11.0 |
| `@mysten/sui` | >=2.36.0 <2.37.0 |
| `@mysten/walrus` | >=1.2.35 <1.3.0 |
| `@mysten/seal` | >=1.5.0 <1.6.0 |
| `react`, `react-dom` | >=18.0.0 |

The package marks `@mysten/walrus` and `@mysten/seal` as optional peers, but `morse-sdk` requires all three Mysten packages. Install them all.

## Provider and setup

Wallet connection is your app's job. The examples here use `@mysten/dapp-kit`. Once a wallet is connected, `useMorseFiles` turns it into the SDK handles that every other hook and component reads: a wallet adapter, a signer, the Walrus read and write adapters, the Seal adapter and a file reader. When the handles are ready, wrap your tree in `MorseFilesProvider`.

```tsx
import type { WalletStandardAccount } from "@arcadiasystems/morse-sdk";
import { MorseFilesProvider, useMorseFiles } from "@arcadiasystems/morse-uploader";
import {
  useSignAndExecuteTransaction,
  useSignPersonalMessage,
  useSignTransaction,
} from "@mysten/dapp-kit";
import walrusWasmUrl from "@mysten/walrus-wasm/web/walrus_wasm_bg.wasm?url";
import type { ReactNode } from "react";

// Mount only while a wallet is connected, e.g. with dapp-kit's useCurrentAccount().
export function MorseFiles({
  account,
  children,
}: {
  account: WalletStandardAccount;
  children: ReactNode;
}) {
  const { mutateAsync: signTransaction } = useSignTransaction();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const setup = useMorseFiles({
    network: "testnet",
    account,
    callbacks: {
      signTransaction: ({ transaction }) => signTransaction({ transaction }),
      signPersonalMessage: ({ message }) => signPersonalMessage({ message }),
      signAndExecuteTransaction: ({ transaction }) =>
        signAndExecuteTransaction({ transaction }),
    },
    walrusWriteConfig: {
      wasmUrl: walrusWasmUrl,
      uploadRelay: {
        host: "https://upload-relay.testnet.walrus.space",
        sendTip: { max: 10_000_000 }, // MIST; see "Walrus upload relay"
      },
    },
  });

  if (setup.status === "error") {
    return <p>Could not prepare your wallet.</p>;
  }
  if (setup.status !== "ready" || setup.handles === null) {
    return <p>Preparing your wallet...</p>;
  }
  return <MorseFilesProvider value={setup.handles}>{children}</MorseFilesProvider>;
}
```

`useMorseFiles` returns `{ status, handles, error }`. `status` moves from `"idle"` to `"preparing"`, then to `"ready"` or `"error"`. The hook rebuilds only when the network or the wallet address changes, so passing new callback objects on every render is safe.

### Options

| Option | Type | Description |
| --- | --- | --- |
| `network` | `"testnet" \| "mainnet"` | The network to build for. Required. |
| `account` | `WalletStandardAccount` | The connected wallet account. Required. |
| `callbacks` | `MorseFilesWalletCallbacks` | `signTransaction`, `signPersonalMessage` and `signAndExecuteTransaction` from your wallet. Required. |
| `suiClient` | `SuiGrpcClient` | The client to build transactions and read with. Defaults to a gRPC client on the network's public RPC. It must be a gRPC client. |
| `walrusWriteConfig` | `{ wasmUrl?, uploadRelay? }` | Options for the default Walrus write adapter. See [Walrus upload relay](#upload-relay). |
| `walrusWrite` | `WalrusWriteAdapter & WalrusFlowCapable` | A prebuilt write adapter. It replaces the default one, so `walrusWriteConfig` is ignored. |
| `walrusRead` | `WalrusReadAdapter` | A prebuilt read adapter. Defaults to the Walrus aggregator. |
| `sealKeyServers` | `readonly KeyServerConfig[]` | Seal key servers for the default Seal adapter. Needed for encrypted files on Walrus Mainnet. See [Seal on Walrus Mainnet](#seal-on-walrus-mainnet). |
| `seal` | `SealAdapter` | A prebuilt Seal adapter. It overrides `sealKeyServers`. |
| `pubkeyCache` | `PubkeyCache` | Cache for the wallet's public key. Defaults to a `localStorage` cache in the browser. |

> **WARNING: Point the wallet and the SDK at one RPC**
>
> The SDK builds and reads over gRPC, while dapp-kit executes over its own JSON-RPC client. Its last release is 1.1.17: Mysten has [deprecated](https://sdk.mystenlabs.com/sui/migrations/sui-2.0/dapp-kit) the package because it supports JSON-RPC only. Mysten's public fullnodes have retired JSON-RPC, so dapp-kit fails with `TypeError: Failed to fetch` before the wallet opens unless its `SuiClientProvider` points at an endpoint that still serves it. When the two clients sit on different nodes, the certify step can also fail with an object-version conflict. For reliable uploads, point `SuiClientProvider` and the `suiClient` option at one dedicated node.

## Components

The styled components live in the `/ui` entry. Import the stylesheet once.

```tsx
import { toSuiAddress } from "@arcadiasystems/morse-sdk";
import { MorseFileUploader } from "@arcadiasystems/morse-uploader/ui";
import "@arcadiasystems/morse-uploader/styles.css";

// Public upload
<MorseFileUploader onUploaded={(result) => console.log(result.shareLink)} />

// Encrypted upload. The connected wallet is always added as a recipient.
const recipients = ["0x71a3...9f2b", "0x88c2...41de"].map((address) => toSuiAddress(address));

<MorseFileUploader
  encrypt
  recipients={recipients}
  onUploaded={(result) => console.log(result.shareLink)}
/>
```

| `MorseFileUploader` prop | Type | Default | Description |
| --- | --- | --- | --- |
| `encrypt` | `boolean` | `false` | Encrypt under Seal so only the recipients can decrypt. |
| `recipients` | `readonly SuiAddress[]` | None | Wallets that can decrypt. The connected wallet is always added on-chain. |
| `defaultEpochs` | `number` | `5` | Starting storage duration, in Walrus epochs. |
| `minEpochs` | `number` | `1` | Shortest duration a user can pick. |
| `maxEpochs` | `number` | `53` | Longest duration a user can pick. 53 epochs is the Walrus lease cap. |
| `onUploaded` | `(result: CompletedFileUpload) => void` | None | Called when an upload completes, with the file ID, the Seal material and the share link. |
| `className` | `string` | None | Extra class on the root element. |

The uploader shows a USD storage-cost estimate before upload, a progress stepper during it, and a share link with a copy button after it. It renders failures with `uploadErrorMessage`.

`MorseFileDownloader` opens one file from a share link. It reads the on-chain record, then downloads a public file or decrypts an encrypted one, with the original file name and type. Images get a preview.

```tsx
import type { RecipientFileId } from "@arcadiasystems/morse-sdk";
import { parseShareLink } from "@arcadiasystems/morse-uploader";
import { MorseFileDownloader } from "@arcadiasystems/morse-uploader/ui";

export function SharedFile() {
  const link = parseShareLink(window.location.href);
  if (link === null) {
    return <p>This link is damaged or is not a Morse share link.</p>;
  }
  return (
    <MorseFileDownloader
      fileId={link.fileId as RecipientFileId}
      sealIdPrefix={link.sealIdPrefix}
      sealNonce={link.sealNonce}
    />
  );
}
```

| `MorseFileDownloader` prop | Type | Description |
| --- | --- | --- |
| `fileId` | `RecipientFileId` | The file's on-chain ID, from the share link. Required. |
| `sealIdPrefix` | `Uint8Array \| null` | Seal material for an encrypted file. Leave it out, or pass `null`, for a public file. |
| `sealNonce` | `Uint8Array \| null` | The other half of the Seal material. Pass it together with `sealIdPrefix`. |
| `className` | `string` | Extra class on the root element. |

To theme the components, set the `--mu-*` CSS variables on any ancestor, such as `--mu-accent-color`, `--mu-surface-color` and `--mu-fg-color`. Or restyle the `mu-*` classes directly.

## Hooks

Build your own UI from the same hooks the components use. The file hooks read their handles from `MorseFilesProvider`, so call them inside it.

| Hook | What it does |
| --- | --- |
| `useMorseFiles(options)` | Builds the handles from a connected wallet. Call it once, above the provider. |
| `useMorseFilesContext()` | Returns the handles. Throws outside the provider. |
| `useFileUpload()` | Uploads one file. `upload({ file, epochs, recipients?, encrypt?, deletable? })` resolves to `{ fileId, blobId, encrypted, sealIdPrefix, sealNonce, shareLink }`. `phase` tracks progress. |
| `useFileDownload(fileId, seal)` | Drives a download page. Loads the on-chain record, then `load()`, `save()` and `download()` read a public file or decrypt an encrypted one. Pass `seal` as `{ sealIdPrefix, sealNonce }` for an encrypted file, or `null`. |
| `useFileDecrypt()` | Lower-level decrypt. `decrypt({ file, sealIdPrefix, sealNonce, ttlMin? })` resolves to the plaintext bytes. |
| `useRecipientFile(fileId)` | Loads a file's on-chain record: name, content type, size, members and blob ID. |
| `useStorageCostEstimate({ sizeBytes, epochs, encrypt?, usdPerGbPerMonth? })` | Estimates storage cost in USD from the Walrus price of $0.023 per GB per month and the network's nominal epoch length. |
| `useDropzone(options)` | Headless drag-and-drop file picker with prop getters. Works without the provider. |
| `useClipboard(resetMs?)` | Copies text and sets `copied` for `resetMs` (2000 ms by default). Works without the provider. |

### Upload from a hook

```tsx
import {
  uploadErrorMessage,
  uploadPhaseLabel,
  useFileUpload,
  useMorseFilesContext,
} from "@arcadiasystems/morse-uploader";

export function UploadButton({ file }: { file: File }) {
  const { network } = useMorseFilesContext();
  const { upload, status, phase, data, error } = useFileUpload();
  const message = error === null ? null : uploadErrorMessage(error, network);

  return (
    <div>
      <button
        type="button"
        disabled={status === "uploading"}
        onClick={() => {
          // upload() rejects on failure; the hook also keeps the error in `error`.
          upload({ file, epochs: 5 }).catch(() => undefined);
        }}
      >
        Upload
      </button>
      {phase !== null && <p>{uploadPhaseLabel(phase)}</p>}
      {data !== null && <p>{data.shareLink}</p>}
      {message !== null && <p>{message.title}: {message.description}</p>}
    </div>
  );
}
```

An upload moves through the phases `encrypting`, `uploading`, `submitting` and `complete`. Public uploads skip `encrypting`. `uploadPhases(encrypted)` returns the ordered list for a progress stepper, and `uploadPhaseLabel(phase)` returns a readable label. Blobs are created deletable unless you pass `deletable: false`.

`uploadErrorMessage(error, network)` returns the SDK's `{ title, description, cause }` for any failure. It rewrites an insufficient-balance error as "Not enough WAL" or "Not enough SUI", with the amounts in whole coins and how to top up on that network.

### Share links

`buildShareLink({ fileId, network, sealIdPrefix, sealNonce })` builds a link of the form `<origin>/#/f/<fileId>?net=<network>&p=<hex>&n=<hex>` on the current origin. `useFileUpload` already returns one as `shareLink`. The `baseUrl` and `pattern` options change the origin and the path.

Everything after `#` stays in the browser, so none of it reaches a server log. The Seal material in the link is not a secret: decryption is still gated by the file's recipient set.

`parseShareLink(href)` reads a link back into `{ fileId, network, sealIdPrefix, sealNonce }`. The Seal fields are `null` for a public file. It returns `null` for a damaged link, including one that carries only one of `p` and `n`. A file ID exists on one network only, so check `network` before you look the file up.

## Walrus upload relay

A direct Walrus write sends slivers to every storage node at once, a burst that many networks cannot sustain. In a browser, write through the upload relay instead: it does that fan-out for you over one connection. The default write adapter uses it when you set `walrusWriteConfig.uploadRelay`, which the uploader hands unchanged to `@mysten/walrus`.

| Network | Relay host |
| --- | --- |
| Testnet | `https://upload-relay.testnet.walrus.space` |
| Walrus Mainnet | `https://upload-relay.mainnet.walrus.space` |

```tsx
const UPLOAD_RELAY_HOSTS = {
  testnet: "https://upload-relay.testnet.walrus.space",
  mainnet: "https://upload-relay.mainnet.walrus.space",
} as const;

const setup = useMorseFiles({
  network,
  account,
  callbacks,
  walrusWriteConfig: {
    wasmUrl: walrusWasmUrl,
    uploadRelay: {
      host: UPLOAD_RELAY_HOSTS[network],
      sendTip: { max: 10_000_000 }, // the most you will pay per upload, in MIST
    },
  },
});
```

The relay charges a tip on every upload, paid in SUI on top of WAL storage and gas. Set `sendTip: { max }`, with `max` in MIST. `@mysten/walrus` then reads the relay's live tip from `/v1/tip-config` and pays it, up to `max`.

- **Always set `sendTip`.** Without it, no tip is sent and the relay refuses the upload.
- **Leave room in `max`.** If the tip is higher, `@mysten/walrus` throws `Tip amount (N) exceeds the maximum allowed tip (M)` before it uploads anything. On Walrus Mainnet the tip grows with the file's encoded size, and even a small file costs more than 1,000,000 MIST, so a cap sized for testnet rejects every Walrus Mainnet upload. The example app uses 10,000,000 MIST.
- **The relay sees your bytes.** Encrypt the file if that matters.

In a browser, the Walrus client also needs the URL of its wasm file. It comes from `@mysten/walrus-wasm`, a dependency of `@mysten/walrus`. The example app installs it directly and imports the URL with Vite's `?url` suffix. Without an explicit URL, Vite serves `index.html` in place of the wasm file and the Walrus client fails to start.

To skip the default adapter, pass a prebuilt `walrusWrite` adapter instead. It must implement `WalrusFlowCapable`, which the two-popup upload needs.

## Encrypted files and Seal on Walrus Mainnet

An encrypted upload encrypts the file under Seal before it leaves the browser, then creates the file and binds its Seal identity in one transaction. The connected wallet is always a recipient, so the owner can always decrypt. At decrypt time, Seal key servers check the file's recipient set on-chain, and a wallet outside it gets no key. Decrypting takes one wallet popup to create a Seal `SessionKey`, which is reused across files until it expires (10 minutes by default; set it with `ttlMin`).

Before it creates that session, `useFileDecrypt` checks that the handles' `signer` belongs to their `address`, because `@mysten/seal` 1.5 no longer does. On a mismatch it rejects with Seal's `UserError`, without opening the wallet or caching a session. `useFileDownload` and `MorseFileDownloader` decrypt through it too. Handles built by `useMorseFiles` always match, so only hand-built handles can fail the check. A signer whose key is an alias of the address is not supported.

Testnet pins an open set of key servers, so encryption works there with no setup. Walrus Mainnet pins none, because every Seal operator there is commercial. To encrypt on Walrus Mainnet, pass `sealKeyServers`. Start from the SDK's `MAINNET_SEAL_COMMITTEE` and add the `apiKeyName` and `apiKey` your operator issues:

```tsx
import { MAINNET_SEAL_COMMITTEE } from "@arcadiasystems/morse-sdk";

const setup = useMorseFiles({
  network: "mainnet",
  account,
  callbacks,
  walrusWriteConfig: {
    wasmUrl: walrusWasmUrl,
    uploadRelay: {
      host: "https://upload-relay.mainnet.walrus.space",
      sendTip: { max: 10_000_000 },
    },
  },
  sealKeyServers: MAINNET_SEAL_COMMITTEE.map((server) => ({
    ...server,
    apiKeyName: "X-API-Key",
    apiKey: sealApiKey, // issued by your Seal operator
  })),
});
```

For full control, pass a prebuilt `seal` adapter instead. It overrides `sealKeyServers`.

Without either, setup still succeeds and `handles.seal` is `null`. Public upload and download keep working, and the encrypted paths reject with an error that names `sealKeyServers`. Read `useMorseFilesContext().seal` and hide the encrypt option when it is `null`. Note that `morse-sdk` verifies its Walrus paths end to end on Walrus Mainnet, but not Seal, because that needs commercial credentials.

> **WARNING: Keep the Seal credential out of the browser bundle**
>
> Anything in a browser bundle is visible to whoever opens devtools. Do not ship the key in client code you do not control. If the credential is not meant to be public, proxy it through your own backend.

The Seal material that decrypts a file (`sealIdPrefix` and `sealNonce`) is not stored on-chain. The share link carries it. If your app lists files in its own UI, store both values next to the file ID.

## Limitations

- **Storage is a lease.** Walrus stores a file for at most 53 epochs ahead, then it expires. An epoch is about 1 day on testnet and about 2 weeks on Walrus Mainnet.
- **No file listing yet.** A `RecipientFile` is a shared object, so it never shows up in a wallet's owned objects. Listing a wallet's files needs an event indexer, and the package ships no listing UI until one exists.
- **Recipients are set at upload.** The components do not change recipients afterwards. The SDK's owner-only `addRecipient` and `removeRecipient` do.

## Next steps

- [Recipient Files](https://docs.morsecms.xyz/recipient-files.html): The on-chain model behind each upload: the recipient set, Seal identities and decryption.
- [SDK: Setup](https://docs.morsecms.xyz/sdk-client-setup.html): Wallet adapters, Walrus adapters and error handling in morse-sdk.
- [morse-uploader on npm](https://www.npmjs.com/package/@arcadiasystems/morse-uploader): The package page, with versions and install details.
