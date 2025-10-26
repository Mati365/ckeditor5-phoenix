defmodule CKEditor5.Components.Cloud.UmdScripts do
  @moduledoc """
  A component for rendering UMD script tags of CKEditor 5 in Phoenix.

  ## ⚠️ Warning

  Import maps can only be used if the preset has the Cloud option enabled, which is not available
  under the GPL license key. You must specify your own Cloud or use a commercial license to utilize
  this feature.
  """

  use Phoenix.Component

  import CKEditor5.Components.Cloud.Assigns

  alias CKEditor5.Cloud.AssetPackageBuilder

  @doc """
  Renders the UMD script tags.
  """
  attr :nonce, :string, default: nil, doc: "The CSP nonce to use for the script tags."

  cloud_build_attrs()

  def render(assigns) do
    assigns = assign_scripts(assigns)

    ~H"""
    <%= for src <- @scripts do %>
      <script src={src} crossorigin="anonymous" nonce={@nonce}></script>
    <% end %>
    """
  end

  defp assign_scripts(assigns) do
    scripts =
      build_cloud!(assigns)
      |> AssetPackageBuilder.build()
      |> Map.get(:js)
      |> Enum.filter(&(&1.type == :umd))
      |> Enum.map(& &1.url)

    Map.put(assigns, :scripts, scripts)
  end
end
