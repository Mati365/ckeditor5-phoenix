defmodule Playground.HomeTest do
  use Playground.FeatureCase

  feature "Home page loads", %{session: session} do
    session
    |> visit(~p"/")
    |> assert_text("CKEditor5 Phoenix Playground")
  end
end
