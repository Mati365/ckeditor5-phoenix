defmodule CKEditor5.Components.Cloud.Stylesheets do
  @moduledoc """
  A component for rendering stylesheet link tags in Phoenix.
  This component generates link tags for CSS stylesheets.
  It can be used to load CKEditor 5 styles in a Phoenix application.

  ## ⚠️ Warning

  This component can only be used if the preset has the Cloud option enabled, which is not available
  under the GPL license key. You must specify your own Cloud or use a commercial license to utilize
  this feature.
  """

  use Phoenix.Component

  alias CKEditor5.Cloud.AssetPackageBuilder
  alias CKEditor5.Preset.CloudCompatibilityChecker
  alias CKEditor5.Presets

  @doc """
  Renders the stylesheet link tags.
  This component can be customized with a `:preset` assign
  to specify which preset's stylesheets to use.
  """
  attr :preset, :string, default: "default", doc: "The name of the preset to use."
  attr :nonce, :string, default: nil, doc: "The CSP nonce to use for the link tags."

  def render(assigns) do
    assigns = assign_stylesheets(assigns)

    ~H"""
    <%= for href <- @stylesheets do %>
      <link rel="stylesheet" href={href} nonce={@nonce} crossorigin="anonymous" />
    <% end %>
    """
  end

  defp assign_stylesheets(%{preset: preset} = assigns) do
    preset = Presets.get!(preset)

    CloudCompatibilityChecker.ensure_cloud_configured!(preset)

    stylesheets =
      AssetPackageBuilder.build(preset.cloud)
      |> Map.get(:css)

    Map.put(assigns, :stylesheets, stylesheets)
  end
end
