defmodule Playground.Router do
  @moduledoc """
  Main router for the playground application.

  This module defines the routing structure and pipelines for handling
  HTTP requests in the playground application.
  """

  use Playground, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :protect_from_forgery
    plug :put_secure_browser_headers
    plug :put_root_layout, {Playground.LayoutHtml, :app}
  end

  pipeline :api do
    plug :accepts, ["json"]
    plug :fetch_session
    plug :protect_from_forgery
  end

  scope "/api/ckeditor5", CKEditor5 do
    pipe_through :api

    post "/upload", Upload.Controller, :upload
  end

  scope "/", Playground do
    pipe_through :browser

    live "/", Live.Home
    live "/classic", Live.Classic
    live "/classic-form", Live.ClassicForm
    live "/classic-required-form", Live.ClassicRequiredForm
    live "/classic-custom-preset", Live.ClassicCustomPreset
    live "/classic-dynamic-preset", Live.ClassicDynamicPreset
    live "/inline", Live.Inline
    live "/balloon", Live.Balloon
    live "/decoupled", Live.Decoupled
    live "/multiroot", Live.Multiroot
    live "/context", Live.Context
    live "/i18n", Live.I18n
    live "/image-upload", Live.ImageUpload
  end
end
