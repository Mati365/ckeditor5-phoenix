defmodule Playground.DecoupledTest do
  use Playground.FeatureCase

  feature "Decoupled Editor: syncs data", %{session: session} do
    session
    |> visit(~p"/decoupled")
    |> type_in_editor(".ck-editor__editable", " decoupled test")
    |> assert_text("decoupled test")
  end
end
