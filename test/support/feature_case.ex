defmodule Playground.FeatureCase do
  @moduledoc """
  This module defines the setup for feature tests, providing
  common functionality and imports.
  """

  use ExUnit.CaseTemplate

  using do
    quote do
      use Wallaby.Feature
      use Playground, :verified_routes

      import Wallaby.Query, except: [text: 1]
      import Playground.FeatureCase

      alias Wallaby.Query
    end
  end

  setup tags do
    {:ok, session} = Wallaby.start_session(metadata: tags)
    {:ok, session: session}
  end

  def type_in_editor(session, selector, text) do
    session
    |> Wallaby.Browser.click(Wallaby.Query.css(selector))
    |> Wallaby.Browser.send_keys([text])
  end
end
