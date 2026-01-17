defmodule Playground.Endpoint do
  @moduledoc """
  Phoenix endpoint for the playground application.

  This module configures the web server endpoint, including routing,
  sessions, and static file serving for the playground.
  """

  use Phoenix.Endpoint, otp_app: :ckeditor5_phoenix

  @session_options [
    store: :cookie,
    key: "_playground_key",
    signing_salt: "uxvjNoy+",
    same_site: "Lax"
  ]

  socket "/live", Phoenix.LiveView.Socket,
    websocket: [connect_info: [session: @session_options]],
    longpoll: [connect_info: [session: @session_options]]

  plug Plug.Static,
    at: "/",
    from: Path.expand("./public", __DIR__),
    only: ~w(favicon.ico robots.txt),
    gzip: false

  plug Plug.Static,
    at: "/assets",
    from: Path.expand("./priv/static", __DIR__),
    gzip: false

  plug Plug.Static,
    at: "/uploads",
    from: Path.expand("./priv/static/uploads", __DIR__),
    gzip: false

  if code_reloading? do
    socket "/phoenix/live_reload/socket", Phoenix.LiveReloader.Socket
    plug Phoenix.LiveReloader
    plug Phoenix.CodeReloader
  end

  plug Plug.RequestId
  plug Plug.Telemetry, event_prefix: [:phoenix, :endpoint]

  plug Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Phoenix.json_library()

  plug Plug.MethodOverride
  plug Plug.Head
  plug Plug.Session, @session_options
  plug Playground.Router
end
