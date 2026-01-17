import Config

cke_playground_dist_channel =
  System.get_env("CKEDITOR5_PLAYGROUND_MODE", "sh") |> String.to_atom()

config :phoenix, :json_library, Jason
config :logger, :level, :debug

config :ckeditor5_phoenix, Playground.DistributionChannel, cke_playground_dist_channel

config :ckeditor5_phoenix, Playground.Endpoint,
  adapter: Bandit.PhoenixAdapter,
  http: [ip: {127, 0, 0, 1}, port: 4000],
  secret_key_base: "nU11FRRf5rf675y2C/A/w5MMnFFg1gVNiOw/PQ+c3G6HZhTa282rEF73U/CJqRRN",
  live_view: [signing_salt: "asdFj3kL"],
  debug_errors: true,
  check_origin: false,
  code_reloader: true,
  render_errors: [view: Playground.View, accepts: ~w(html)],
  server: true,
  pubsub_server: Playground.PubSub,
  serve_endpoints: true,
  watchers: [
    npm: {
      System,
      :cmd,
      ["npm", ["run", "npm_package:watch"], [cd: File.cwd!(), into: IO.stream(:stdio, :line)]]
    },
    tailwind: {Tailwind, :install_and_run, [:ckeditor, ~w(--watch)]},
    esbuild: {Esbuild, :install_and_run, [:ckeditor, ~w(--sourcemap=inline --watch)]}
  ],
  live_reload: [
    patterns: [
      ~r"config/.*(exs)$",
      ~r"playground/.*(ex|eex|js|css)$",
      ~r"lib/.*(ex|eex|js|css)$"
    ]
  ]

config :ckeditor5_phoenix,
  uploads: [
    folder: "playground/priv/static/uploads",
    url: "/uploads"
  ],
  contexts: %{
    "custom" => %{
      config: %{
        plugins: [
          :CustomContextPlugin
        ]
      },
      watchdog: %{
        crash_number_limit: 20
      }
    }
  },
  presets: %{
    "custom" => %{
      custom_translations: %{
        en: %{
          Bold: "Custom Bold",
          Italic: "Custom Italic"
        }
      },
      config: %{
        toolbar: [
          :undo,
          :redo,
          :|,
          :heading,
          :|,
          :bold,
          :italic,
          :underline,
          :|,
          :link,
          :insertImage,
          :insertTable,
          :blockQuote,
          :|,
          :bulletedList,
          :numberedList,
          :outdent,
          :indent
        ],
        plugins: [
          :HelloWorldPlugin,
          :AccessibilityHelp,
          :Autoformat,
          :BlockQuote,
          :Bold,
          :Essentials,
          :Heading,
          :ImageBlock,
          :ImageCaption,
          :ImageInsert,
          :ImageInsertViaUrl,
          :ImageResize,
          :ImageStyle,
          :ImageTextAlternative,
          :ImageToolbar,
          :ImageUpload,
          :Indent,
          :Italic,
          :Link,
          :LinkImage,
          :List,
          :Paragraph,
          :PasteFromOffice,
          :SelectAll,
          :Table,
          :TableToolbar,
          :TextTransformation,
          :Underline,
          :Undo,
          :Base64UploadAdapter
        ],
        table: %{
          contentToolbar: [
            :tableColumn,
            :tableRow,
            :mergeTableCells
          ]
        },
        image: %{
          toolbar: [
            :imageTextAlternative,
            :imageStyle,
            :imageResize
          ]
        }
      }
    }
  }

config :esbuild,
  version: "0.25.0",
  ckeditor: [
    args:
      ~w(
      ./js/app.ts
      --bundle
      --target=es2022
      --format=esm
      --splitting
      --outdir=./priv/static
    ) ++
        if cke_playground_dist_channel == :cloud do
          ~w(--external:ckeditor5 --external:ckeditor5-premium-features)
        else
          []
        end,
    cd: Path.expand("../playground/", __DIR__),
    env: %{"NODE_PATH" => Path.expand("../deps", __DIR__)}
  ]

config :tailwind,
  version: "4.0.0",
  ckeditor: [
    args: ~w(
      --input=css/app.#{cke_playground_dist_channel}.scss
      --output=priv/static/app.css
    ),
    cd: Path.expand("../playground", __DIR__)
  ]
