import Config

config :phoenix, :json_library, Jason
config :logger, :level, :debug

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

import_config "playground.exs"
