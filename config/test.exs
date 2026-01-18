import Config

config :phoenix, :json_library, Jason
config :logger, :level, :warning

config :ckeditor5_phoenix, Playground.Endpoint,
  adapter: Bandit.PhoenixAdapter,
  http: [ip: {127, 0, 0, 1}, port: 5000],
  secret_key_base: "xK4YhC5V4rUFGa5biXASSgET/yIL4lAuvwrSqZgFP1vJx2kmv1Pb2/4ihxjcT3mE",
  live_view: [signing_salt: "hMegieSe"],
  debug_errors: true,
  check_origin: false,
  code_reloader: false,
  render_errors: [view: Playground.View, accepts: ~w(html)],
  server: true,
  pubsub_server: Playground.PubSub

config :wallaby,
  otp_app: :playground,
  screenshot_on_failure: true,
  chromedriver: [
    path: "./node_modules/.bin/chromedriver",
    headless: true
  ]

import_config "playground.exs"
