defmodule Playground.BalloonTest do
  use Playground.FeatureCase

  feature "Balloon Editor: syncs data", %{session: session} do
    session
    |> visit(~p"/balloon")
    |> type_in_editor(".ck-editor__editable", " balloon test")
    |> assert_text("balloon test")
  end
end
